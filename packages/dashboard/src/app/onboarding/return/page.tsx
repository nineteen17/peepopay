'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

function OnboardingReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      // Wait a bit for Stripe webhook to process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        // Refresh user data to check if onboarding is complete
        await refreshUser();
        setStatus('success');
      } catch (error) {
        setStatus('error');
      }
    };

    checkOnboardingStatus();
  }, [refreshUser]);

  const handleContinue = () => {
    router.push('/dashboard');
  };

  const handleRetry = () => {
    router.push('/onboarding');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        {status === 'loading' && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
              <CardTitle>Processing...</CardTitle>
              <CardDescription>
                We're verifying your Stripe account connection
              </CardDescription>
            </CardHeader>
          </>
        )}

        {status === 'success' && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Account Connected!</CardTitle>
              <CardDescription>
                Your Stripe account has been successfully connected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    You're all set! You can now start accepting bookings and payments from your customers.
                  </p>
                </div>
                <Button onClick={handleContinue} className="w-full">
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {status === 'error' && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>Connection Failed</CardTitle>
              <CardDescription>
                We couldn't verify your Stripe account connection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive">
                  <p className="text-sm text-destructive">
                    There was an issue connecting your Stripe account. Please try again or contact support if the problem persists.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleRetry} className="flex-1">
                    Try Again
                  </Button>
                  <Button onClick={handleContinue} variant="outline" className="flex-1">
                    Continue Anyway
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}

export default function OnboardingReturnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <OnboardingReturnContent />
    </Suspense>
  );
}
