import { useState } from 'react';
import { User, Mail, Phone, MessageSquare, MapPin, AlertCircle } from 'lucide-react';
import { validateCustomerForm, getFieldError } from '../lib/validation';

interface CustomerFormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  notes: string;
}

interface CustomerFormProps {
  formData: CustomerFormData;
  onChange: (data: CustomerFormData) => void;
}

export default function CustomerForm({ formData, onChange }: CustomerFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleBlur = (fieldName: string) => {
    setTouched({ ...touched, [fieldName]: true });
    validateField(fieldName);
  };

  const validateField = (fieldName: string) => {
    const result = validateCustomerForm(formData);
    const error = getFieldError(result, fieldName);

    setErrors((prev) => ({
      ...prev,
      [fieldName]: error || '',
    }));
  };

  const handleChange = (fieldName: string, value: string) => {
    onChange({ ...formData, [fieldName]: value });

    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: '' }));
    }
  };

  const showError = (fieldName: string) => touched[fieldName] && errors[fieldName];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Your Information</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <User className="h-4 w-4 text-gray-400" />
          Full Name *
        </label>
        <input
          type="text"
          required
          value={formData.customerName}
          onChange={(e) => handleChange('customerName', e.target.value)}
          onBlur={() => handleBlur('customerName')}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all ${
            showError('customerName')
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
          }`}
          placeholder="John Smith"
          minLength={2}
          maxLength={100}
        />
        {showError('customerName') && (
          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.customerName}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <Mail className="h-4 w-4 text-gray-400" />
          Email Address *
        </label>
        <input
          type="email"
          required
          value={formData.customerEmail}
          onChange={(e) => handleChange('customerEmail', e.target.value)}
          onBlur={() => handleBlur('customerEmail')}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all ${
            showError('customerEmail')
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
          }`}
          placeholder="john@example.com"
        />
        {showError('customerEmail') && (
          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.customerEmail}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <Phone className="h-4 w-4 text-gray-400" />
          Phone Number *
        </label>
        <input
          type="tel"
          required
          value={formData.customerPhone}
          onChange={(e) => handleChange('customerPhone', e.target.value)}
          onBlur={() => handleBlur('customerPhone')}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all ${
            showError('customerPhone')
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
          }`}
          placeholder="(555) 123-4567"
          minLength={10}
          maxLength={20}
        />
        {showError('customerPhone') && (
          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.customerPhone}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-400" />
          Address (Optional)
        </label>
        <input
          type="text"
          value={formData.customerAddress}
          onChange={(e) => handleChange('customerAddress', e.target.value)}
          onBlur={() => handleBlur('customerAddress')}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all ${
            showError('customerAddress')
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
          }`}
          placeholder="123 Main St, City, State ZIP"
          maxLength={500}
        />
        {showError('customerAddress') && (
          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.customerAddress}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-gray-400" />
          Additional Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          onBlur={() => handleBlur('notes')}
          rows={3}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all resize-none ${
            showError('notes')
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
          }`}
          placeholder="Any special requirements or notes..."
          maxLength={1000}
        />
        {showError('notes') && (
          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.notes}
          </p>
        )}
      </div>
    </div>
  );
}
