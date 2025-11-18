'use client';

import { useState } from 'react';
import { Mail, X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface VerificationBannerProps {
  userEmail: string;
}

export function VerificationBanner({ userEmail }: VerificationBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleResend = async () => {
    setIsResending(true);
    setMessage(null);

    try {
      await api.resendVerificationEmail(userEmail);
      setMessage({
        type: 'success',
        text: 'Verification email sent! Please check your inbox.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to send verification email. Please try again.',
      });
    } finally {
      setIsResending(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Mail className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900">
                Please verify your email address
              </p>
              <p className="text-xs text-yellow-700 mt-0.5">
                We sent a verification email to <span className="font-medium">{userEmail}</span>.
                {message && (
                  <span
                    className={`ml-2 ${
                      message.type === 'success' ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {message.text}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResend}
              disabled={isResending}
              className="text-sm font-medium text-yellow-900 hover:text-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-yellow-100 transition-colors"
            >
              {isResending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Resend Email'
              )}
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="text-yellow-600 hover:text-yellow-900 p-1 rounded-md hover:bg-yellow-100 transition-colors"
              aria-label="Close banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
