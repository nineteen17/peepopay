'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStartStripeOnboarding } from '@/hooks/queries';
import { CreditCard, CheckCircle, ArrowRight } from 'lucide-react';

export default function OnboardingPage() {
  const [error, setError] = useState('');
  const stripeOnboardingMutation = useStartStripeOnboarding();

  const handleStartOnboarding = async () => {
    setError('');

    stripeOnboardingMutation.mutate(undefined, {
      onSuccess: (response) => {
        // Redirect to Stripe onboarding
        window.location.href = response.url;
      },
      onError: (err: any) => {
        setError(err.message || 'Failed to start onboarding. Please try again.');
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Connect Your Stripe Account</CardTitle>
          <CardDescription className="text-base mt-2">
            To start accepting payments, you need to connect your Stripe account. This allows money to flow directly to you with just a 2.5% platform fee.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive rounded-md">
              {error}
            </div>
          )}

          {/* Benefits List */}
          <div className="space-y-4">
            <h3 className="font-semibold">What you'll get:</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Direct Payments</div>
                  <div className="text-sm text-muted-foreground">
                    Money flows directly to your Stripe account
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Transparent Fees</div>
                  <div className="text-sm text-muted-foreground">
                    Only 2.5% platform fee + Stripe's standard payment processing fees
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Secure & Trusted</div>
                  <div className="text-sm text-muted-foreground">
                    Powered by Stripe, the industry standard for online payments
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Quick Setup</div>
                  <div className="text-sm text-muted-foreground">
                    Connect in just a few minutes with Stripe's guided onboarding
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">How it works:</h3>
            <ol className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary">1.</span>
                <span>Click "Connect Stripe Account" below</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary">2.</span>
                <span>Complete Stripe's secure onboarding process</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary">3.</span>
                <span>Return to PeepoPay and start accepting bookings</span>
              </li>
            </ol>
          </div>

          <Button
            onClick={handleStartOnboarding}
            disabled={stripeOnboardingMutation.isPending}
            className="w-full"
            size="lg"
          >
            {stripeOnboardingMutation.isPending ? (
              'Redirecting to Stripe...'
            ) : (
              <>
                Connect Stripe Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            By connecting your Stripe account, you agree to Stripe's{' '}
            <a
              href="https://stripe.com/connect-account/legal"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Connected Account Agreement
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
