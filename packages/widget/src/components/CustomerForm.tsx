import { User, Mail, Phone, MessageSquare } from 'lucide-react';

interface CustomerFormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
}

interface CustomerFormProps {
  formData: CustomerFormData;
  onChange: (data: CustomerFormData) => void;
}

export default function CustomerForm({ formData, onChange }: CustomerFormProps) {
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
          onChange={(e) => onChange({ ...formData, customerName: e.target.value })}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder="John Smith"
        />
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
          onChange={(e) => onChange({ ...formData, customerEmail: e.target.value })}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder="john@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <Phone className="h-4 w-4 text-gray-400" />
          Phone Number
        </label>
        <input
          type="tel"
          value={formData.customerPhone}
          onChange={(e) => onChange({ ...formData, customerPhone: e.target.value })}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder="(555) 123-4567"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-gray-400" />
          Additional Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => onChange({ ...formData, notes: e.target.value })}
          rows={3}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
          placeholder="Any special requirements or notes..."
        />
      </div>
    </div>
  );
}
