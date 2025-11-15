import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPaymentIntent } from './stripe.js';
import Stripe from 'stripe';

// Mock Stripe
vi.mock('stripe', () => {
  const mockStripe = {
    paymentIntents: {
      create: vi.fn(),
    },
    accounts: {
      create: vi.fn(),
      retrieve: vi.fn(),
    },
    accountLinks: {
      create: vi.fn(),
    },
    refunds: {
      create: vi.fn(),
    },
  };
  return {
    default: vi.fn(() => mockStripe),
  };
});

describe('Flex Pass Payment Processing', () => {
  let mockStripe: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Get the mocked Stripe instance
    const StripeConstructor = vi.mocked(Stripe);
    mockStripe = new StripeConstructor('test_key', { apiVersion: '2023-10-16', typescript: true });
  });

  describe('createPaymentIntent - Without Flex Pass', () => {
    it('should create payment intent with only deposit and base platform fee', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'secret_test123',
        amount: 10000,
        application_fee_amount: 250,
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await createPaymentIntent({
        amount: 10000, // $100
        connectedAccountId: 'acct_test',
        metadata: {
          serviceId: 'service123',
          serviceName: 'Test Service',
        },
      });

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 10000,
        currency: 'aud',
        customer: undefined,
        application_fee_amount: 250, // 2.5% of $100 = $2.50
        transfer_data: {
          destination: 'acct_test',
        },
        metadata: {
          serviceId: 'service123',
          serviceName: 'Test Service',
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      expect(result).toEqual(mockPaymentIntent);
    });

    it('should calculate correct platform fee for deposit only', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'secret_test123',
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      await createPaymentIntent({
        amount: 5000, // $50
        connectedAccountId: 'acct_test',
      });

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000,
          application_fee_amount: 125, // 2.5% of $50 = $1.25
        })
      );
    });
  });

  describe('createPaymentIntent - With Flex Pass (60% platform)', () => {
    it('should create payment intent with deposit + flex pass and combined fees', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'secret_test123',
        amount: 10500,
        application_fee_amount: 550,
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await createPaymentIntent({
        amount: 10000, // $100 deposit
        flexPassFee: 500, // $5 flex pass
        flexPassPlatformSharePercent: 60, // 60% to platform
        connectedAccountId: 'acct_test',
        metadata: {
          serviceId: 'service123',
        },
      });

      // Expected fees:
      // Deposit platform fee: 2.5% of $100 = $2.50 (250 cents)
      // Flex pass platform fee: 60% of $5 = $3.00 (300 cents)
      // Total application fee: $5.50 (550 cents)

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 10500, // $100 + $5 = $105
        currency: 'aud',
        customer: undefined,
        application_fee_amount: 550, // $2.50 + $3.00 = $5.50
        transfer_data: {
          destination: 'acct_test',
        },
        metadata: {
          serviceId: 'service123',
          flexPassFee: '500',
          flexPassPlatformFee: '300',
          flexPassProviderFee: '200',
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      expect(result).toEqual(mockPaymentIntent);
    });

    it('should add flex pass metadata to payment intent', async () => {
      const mockPaymentIntent = { id: 'pi_test123' };
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      await createPaymentIntent({
        amount: 10000,
        flexPassFee: 1000,
        flexPassPlatformSharePercent: 60,
        connectedAccountId: 'acct_test',
      });

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            flexPassFee: '1000',
            flexPassPlatformFee: '600', // 60% of $10 = $6
            flexPassProviderFee: '400', // 40% of $10 = $4
          }),
        })
      );
    });

    it('should default to 60% platform share if not specified', async () => {
      const mockPaymentIntent = { id: 'pi_test123' };
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      await createPaymentIntent({
        amount: 10000,
        flexPassFee: 1000, // $10
        // flexPassPlatformSharePercent not specified
        connectedAccountId: 'acct_test',
      });

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          application_fee_amount: 850, // $2.50 (deposit) + $6.00 (60% of flex pass) = $8.50
          metadata: expect.objectContaining({
            flexPassPlatformFee: '600', // Defaults to 60%
          }),
        })
      );
    });
  });

  describe('createPaymentIntent - With Flex Pass (70% platform)', () => {
    it('should calculate correct fees with 70% platform share', async () => {
      const mockPaymentIntent = { id: 'pi_test123' };
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      await createPaymentIntent({
        amount: 10000, // $100 deposit
        flexPassFee: 1000, // $10 flex pass
        flexPassPlatformSharePercent: 70, // 70% to platform
        connectedAccountId: 'acct_test',
      });

      // Expected fees:
      // Deposit platform fee: 2.5% of $100 = $2.50 (250 cents)
      // Flex pass platform fee: 70% of $10 = $7.00 (700 cents)
      // Total application fee: $9.50 (950 cents)

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 11000, // $100 + $10 = $110
          application_fee_amount: 950, // $2.50 + $7.00 = $9.50
          metadata: expect.objectContaining({
            flexPassFee: '1000',
            flexPassPlatformFee: '700',
            flexPassProviderFee: '300',
          }),
        })
      );
    });

    it('should handle provider 30% share correctly', async () => {
      const mockPaymentIntent = { id: 'pi_test123' };
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      await createPaymentIntent({
        amount: 5000,
        flexPassFee: 1000,
        flexPassPlatformSharePercent: 70,
        connectedAccountId: 'acct_test',
      });

      // Provider receives:
      // - Deposit: $50 - $1.25 (platform fee) = $48.75
      // - Flex pass: 30% of $10 = $3.00
      // - Total to provider: $51.75

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            flexPassProviderFee: '300', // 30% of $10
          }),
        })
      );
    });
  });

  describe('Revenue Split Calculations', () => {
    it('should split $5 flex pass with 60% platform share', async () => {
      const mockPaymentIntent = { id: 'pi_test123' };
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      await createPaymentIntent({
        amount: 10000,
        flexPassFee: 500, // $5
        flexPassPlatformSharePercent: 60,
        connectedAccountId: 'acct_test',
      });

      // Platform: 60% of $5 = $3.00
      // Provider: 40% of $5 = $2.00

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            flexPassPlatformFee: '300',
            flexPassProviderFee: '200',
          }),
        })
      );
    });

    it('should handle edge case of $1 flex pass fee', async () => {
      const mockPaymentIntent = { id: 'pi_test123' };
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      await createPaymentIntent({
        amount: 10000,
        flexPassFee: 100, // $1
        flexPassPlatformSharePercent: 60,
        connectedAccountId: 'acct_test',
      });

      // Platform: 60% of $1 = $0.60
      // Provider: 40% of $1 = $0.40

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            flexPassPlatformFee: '60',
            flexPassProviderFee: '40',
          }),
        })
      );
    });

    it('should round platform fee correctly', async () => {
      const mockPaymentIntent = { id: 'pi_test123' };
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      await createPaymentIntent({
        amount: 10000,
        flexPassFee: 333, // $3.33
        flexPassPlatformSharePercent: 60,
        connectedAccountId: 'acct_test',
      });

      // Platform: 60% of 333 = 199.8 → rounds to 200
      // Provider: 333 - 200 = 133

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            flexPassPlatformFee: '200', // Rounded
            flexPassProviderFee: '133',
          }),
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should ignore flex pass if fee is 0', async () => {
      const mockPaymentIntent = { id: 'pi_test123' };
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      await createPaymentIntent({
        amount: 10000,
        flexPassFee: 0,
        flexPassPlatformSharePercent: 60,
        connectedAccountId: 'acct_test',
      });

      // Should behave like no flex pass
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 10000, // No flex pass added
          application_fee_amount: 250, // Only deposit fee
          metadata: {}, // No flex pass metadata
        })
      );
    });

    it('should ignore flex pass if fee is negative', async () => {
      const mockPaymentIntent = { id: 'pi_test123' };
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      await createPaymentIntent({
        amount: 10000,
        flexPassFee: -500,
        flexPassPlatformSharePercent: 60,
        connectedAccountId: 'acct_test',
      });

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 10000, // Negative fee ignored
          application_fee_amount: 250,
        })
      );
    });

    it('should ignore flex pass if not provided', async () => {
      const mockPaymentIntent = { id: 'pi_test123' };
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      await createPaymentIntent({
        amount: 10000,
        connectedAccountId: 'acct_test',
      });

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 10000,
          application_fee_amount: 250,
          metadata: {}, // No flex pass metadata
        })
      );
    });

    it('should handle large flex pass fees', async () => {
      const mockPaymentIntent = { id: 'pi_test123' };
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      await createPaymentIntent({
        amount: 50000, // $500 deposit
        flexPassFee: 10000, // $100 flex pass
        flexPassPlatformSharePercent: 65,
        connectedAccountId: 'acct_test',
      });

      // Deposit fee: 2.5% of $500 = $12.50 (1250 cents)
      // Flex pass fee: 65% of $100 = $65.00 (6500 cents)
      // Total: $77.50 (7750 cents)

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 60000, // $500 + $100
          application_fee_amount: 7750, // $12.50 + $65.00
          metadata: expect.objectContaining({
            flexPassFee: '10000',
            flexPassPlatformFee: '6500',
            flexPassProviderFee: '3500',
          }),
        })
      );
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle typical plumber booking with flex pass', async () => {
      const mockPaymentIntent = { id: 'pi_test123' };
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      // $50 deposit + $5 flex pass with 60% platform share
      await createPaymentIntent({
        amount: 5000,
        flexPassFee: 500,
        flexPassPlatformSharePercent: 60,
        connectedAccountId: 'acct_plumber',
        metadata: {
          serviceName: 'Emergency Plumbing',
        },
      });

      // Total charged: $55
      // Platform gets: $1.25 (deposit fee) + $3.00 (flex pass 60%) = $4.25
      // Plumber gets: $48.75 (after deposit fee) + $2.00 (flex pass 40%) = $50.75

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5500,
          application_fee_amount: 425,
        })
      );
    });

    it('should handle dental appointment with flex pass', async () => {
      const mockPaymentIntent = { id: 'pi_test123' };
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      // $100 deposit + $10 flex pass with 70% platform share
      await createPaymentIntent({
        amount: 10000,
        flexPassFee: 1000,
        flexPassPlatformSharePercent: 70,
        connectedAccountId: 'acct_dentist',
      });

      // Total charged: $110
      // Platform gets: $2.50 (deposit fee) + $7.00 (flex pass 70%) = $9.50
      // Dentist gets: $97.50 (after deposit fee) + $3.00 (flex pass 30%) = $100.50

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 11000,
          application_fee_amount: 950,
          metadata: expect.objectContaining({
            flexPassPlatformFee: '700',
            flexPassProviderFee: '300',
          }),
        })
      );
    });

    it('should handle legal consultation without flex pass', async () => {
      const mockPaymentIntent = { id: 'pi_test123' };
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      // $200 deposit, no flex pass
      await createPaymentIntent({
        amount: 20000,
        connectedAccountId: 'acct_lawyer',
      });

      // Total charged: $200
      // Platform gets: $5.00 (2.5% deposit fee)
      // Lawyer gets: $195.00

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 20000,
          application_fee_amount: 500,
        })
      );
    });
  });
});
