import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  depositAmount: number;
  fullPrice: number;
}

interface BookingWidgetProps {
  userSlug: string;
}

export default function BookingWidget({ userSlug }: BookingWidgetProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'select' | 'details' | 'payment' | 'success'>('select');

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    bookingDate: '',
    notes: '',
  });

  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    fetchServices();
  }, [userSlug]);

  async function fetchServices() {
    try {
      const response = await fetch(`${API_URL}/api/services/user/${userSlug}`);
      const data = await response.json();
      setServices(data.services || []);
    } catch (error) {
      console.error('Failed to fetch services:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedService || !stripe || !elements) return;

    try {
      setLoading(true);

      // Create booking
      const response = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedService.id,
          ...formData,
          depositAmount: selectedService.depositAmount,
          duration: selectedService.duration,
        }),
      });

      const { booking, clientSecret } = await response.json();

      // Confirm payment
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) return;

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: formData.customerName,
            email: formData.customerEmail,
          },
        },
      });

      if (error) {
        alert(`Payment failed: ${error.message}`);
      } else if (paymentIntent.status === 'succeeded') {
        setStep('success');
      }
    } catch (error) {
      console.error('Booking failed:', error);
      alert('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loading && services.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading services...</p>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
        <p className="text-gray-600 mb-4">
          You'll receive a confirmation email shortly.
        </p>
        <button
          onClick={() => {
            setStep('select');
            setSelectedService(null);
            setFormData({
              customerName: '',
              customerEmail: '',
              customerPhone: '',
              bookingDate: '',
              notes: '',
            });
          }}
          className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
        >
          Book Another Service
        </button>
      </div>
    );
  }

  if (step === 'select') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Select a Service</h2>

        {services.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            No services available at this time.
          </p>
        ) : (
          <div className="space-y-4">
            {services.map((service) => (
              <div
                key={service.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-primary-500 cursor-pointer transition"
                onClick={() => {
                  setSelectedService(service);
                  setStep('details');
                }}
              >
                <h3 className="text-lg font-bold">{service.name}</h3>
                <p className="text-gray-600 text-sm mt-1">{service.description}</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-sm text-gray-500">{service.duration} minutes</span>
                  <span className="text-lg font-bold text-primary-500">
                    ${(service.depositAmount / 100).toFixed(2)} deposit
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (step === 'details' && selectedService) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <button
          onClick={() => setStep('select')}
          className="text-primary-500 mb-4 hover:underline"
        >
          ← Back to services
        </button>

        <h2 className="text-2xl font-bold mb-2">{selectedService.name}</h2>
        <p className="text-gray-600 mb-6">{selectedService.description}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              required
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              required
              value={formData.customerEmail}
              onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={formData.customerPhone}
              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Preferred Date & Time *</label>
            <input
              type="datetime-local"
              required
              value={formData.bookingDate}
              onChange={(e) => setFormData({ ...formData, bookingDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Card Details *</label>
            <div className="border border-gray-300 rounded-lg p-3">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="border-t pt-4 mt-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-600">Deposit Amount:</span>
              <span className="text-2xl font-bold text-primary-500">
                ${(selectedService.depositAmount / 100).toFixed(2)}
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || !stripe}
              className="w-full px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Processing...' : 'Pay Deposit & Book'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return null;
}
