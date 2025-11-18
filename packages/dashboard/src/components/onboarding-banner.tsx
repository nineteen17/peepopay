'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OnboardingBannerProps {
  userName: string;
}

export function OnboardingBanner({ userName }: OnboardingBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const router = useRouter();

  if (!isVisible) {
    return null;
  }

  const handleStartOnboarding = () => {
    router.push('/onboarding');
  };

  return (
    <div className="bg-blue-50 border-b border-blue-200 dark:bg-blue-950 dark:border-blue-900">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Complete your setup to start accepting payments
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                Connect your Stripe account to receive payments directly. You can explore the dashboard now and set up payments later.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleStartOnboarding}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Connect Stripe
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <button
              onClick={() => setIsVisible(false)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-100 p-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
