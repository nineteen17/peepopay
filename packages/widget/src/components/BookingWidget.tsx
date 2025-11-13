import { useState, useEffect } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import ServiceSelection from './ServiceSelection';
import DateTimePicker from './DateTimePicker';
import CustomerForm from './CustomerForm';
import { ArrowLeft, CreditCard, CheckCircle, Loader2 } from 'lucide-react';
import type { Service, NewBooking, CreateBookingResponse } from '../types/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface BookingWidgetProps {
  userSlug: string;
}

export default function BookingWidget({ userSlug }: BookingWidgetProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'service' | 'datetime' | 'details' | 'payment' | 'success'>('service');

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
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
      setError('Failed to load services. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setStep('datetime');
  };

  const handleDateTimeSelect = (date: Date) => {
    setSelectedDateTime(date);
  };

  const handleContinueToDetails = () => {
    if (!selectedDateTime) return;
    setStep('details');
  };

  const handleContinueToPayment = () => {
    if (!formData.customerName || !formData.customerEmail || !formData.customerPhone) return;
    setStep('payment');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedService || !selectedDateTime || !stripe || !elements) return;

    setSubmitting(true);
    setError('');

    try {
      // Create booking with correct API payload
      const bookingPayload: NewBooking = {
        serviceId: selectedService.id,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        customerAddress: formData.customerAddress || undefined,
        bookingDate: selectedDateTime.toISOString(),
        notes: formData.notes || undefined,
      };

      const response = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
      });

      if (!response.ok) {
        throw new Error('Failed to create booking');
      }

      const data: CreateBookingResponse = await response.json();
      const { clientSecret } = data;

      // Confirm payment with updated Stripe API
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        clientSecret,
        elements,
        confirmParams: {
          payment_method_data: {
            billing_details: {
              name: formData.customerName,
              email: formData.customerEmail,
              phone: formData.customerPhone || undefined,
            },
          },
        },
        redirect: 'if_required',
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent.status === 'succeeded') {
        setStep('success');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep('service');
    setSelectedService(null);
    setSelectedDateTime(null);
    setFormData({
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerAddress: '',
      notes: '',
    });
    setError('');
  };

  const handleBack = () => {
    if (step === 'datetime') setStep('service');
    else if (step === 'details') setStep('datetime');
    else if (step === 'payment') setStep('details');
  };

  // Success screen
  if (step === 'success') {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Booking Confirmed!</h2>
        <p className="text-lg text-gray-600 mb-2">
          Thank you for your booking, {formData.customerName}!
        </p>
        <p className="text-gray-500 mb-8">
          A confirmation email has been sent to {formData.customerEmail}
        </p>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">Booking Details</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex justify-between">
              <span>Service:</span>
              <span className="font-medium">{selectedService?.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Date & Time:</span>
              <span className="font-medium">
                {selectedDateTime && new Date(selectedDateTime).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Duration:</span>
              <span className="font-medium">{selectedService?.duration} minutes</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleReset}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Book Another Service
        </button>
      </div>
    );
  }

  // Service selection
  if (step === 'service') {
    return (
      <ServiceSelection
        services={services}
        onSelect={handleServiceSelect}
        loading={loading}
      />
    );
  }

  // Date/Time, Details, and Payment steps
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="text-sm text-gray-500">
            Step {step === 'datetime' ? '1' : step === 'details' ? '2' : '3'} of 3
          </div>
        </div>

        <div className="flex gap-2">
          <div className={`h-2 flex-1 rounded-full ${step !== 'datetime' ? 'bg-blue-600' : 'bg-gray-200'}`} />
          <div className={`h-2 flex-1 rounded-full ${step === 'payment' ? 'bg-blue-600' : step === 'details' ? 'bg-blue-400' : 'bg-gray-200'}`} />
          <div className={`h-2 flex-1 rounded-full ${step === 'payment' ? 'bg-blue-400' : 'bg-gray-200'}`} />
        </div>
      </div>

      {/* Service Info */}
      {selectedService && (
        <div className="mb-8 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
          <div className="font-semibold text-gray-900">{selectedService.name}</div>
          <div className="text-sm text-gray-600 mt-1">{selectedService.description}</div>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-700">
            <span>{selectedService.duration} minutes</span>
            <span className="font-bold text-blue-600">${(selectedService.depositAmount / 100).toFixed(2)}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700">
          {error}
        </div>
      )}

      {/* DateTime Selection */}
      {step === 'datetime' && (
        <>
          <DateTimePicker
            selectedDateTime={selectedDateTime}
            onSelect={handleDateTimeSelect}
          />
          <button
            onClick={handleContinueToDetails}
            disabled={!selectedDateTime}
            className="w-full mt-6 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg transition-colors"
          >
            Continue to Details
          </button>
        </>
      )}

      {/* Customer Details */}
      {step === 'details' && (
        <>
          <CustomerForm formData={formData} onChange={setFormData} />
          <button
            onClick={handleContinueToPayment}
            disabled={!formData.customerName || !formData.customerEmail || !formData.customerPhone}
            className="w-full mt-6 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg transition-colors"
          >
            Continue to Payment
          </button>
        </>
      )}

      {/* Payment */}
      {step === 'payment' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-gray-400" />
              Card Details
            </label>
            <div className="border-2 border-gray-200 rounded-xl p-4 focus-within:border-blue-500 transition-colors">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#1f2937',
                      fontFamily: 'system-ui, sans-serif',
                      '::placeholder': {
                        color: '#9ca3af',
                      },
                    },
                    invalid: {
                      color: '#ef4444',
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="border-t-2 pt-6">
            <div className="flex justify-between items-center mb-6">
              <span className="text-gray-700 font-medium">Total Amount:</span>
              <span className="text-3xl font-bold text-blue-600">
                ${selectedService && (selectedService.depositAmount / 100).toFixed(2)}
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting || !stripe}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                'Complete Booking'
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              Your payment is secure and encrypted. By completing this booking, you agree to our terms of service.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
