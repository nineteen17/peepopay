import { Clock, DollarSign } from 'lucide-react';
import type { Service } from '../types/api';

interface ServiceSelectionProps {
  services: Service[];
  onSelect: (service: Service) => void;
  loading: boolean;
}

export default function ServiceSelection({ services, onSelect, loading }: ServiceSelectionProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading services...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Select a Service</h2>
        <p className="text-gray-600 mt-2">Choose the service you'd like to book</p>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-gray-600 text-lg">No services available at this time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {services.filter(s => s.isActive).map((service) => (
            <button
              key={service.id}
              onClick={() => onSelect(service)}
              className="w-full text-left border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-lg transition-all duration-200 group"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {service.name}
                </h3>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    ${(service.depositAmount / 100).toFixed(2)}
                  </div>
                </div>
              </div>

              <p className="text-gray-600 mb-4">{service.description}</p>

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{service.duration} minutes</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
