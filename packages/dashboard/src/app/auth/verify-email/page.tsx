'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { Mail, Check, Loader2, AlertCircle } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResend = async () => {
    if (countdown > 0 || !email) return;

    setIsResending(true);
    setResendStatus(null);

    try {
      await api.resendVerificationEmail(email);
      setResendStatus({
        type: 'success',
        message: 'Verification email sent! Please check your inbox.',
      });
      setCountdown(60); // 60 second cooldown
    } catch (error: any) {
      setResendStatus({
        type: 'error',
        message: error.message || 'Failed to send verification email. Please try again.',
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
            <CardDescription className="text-base">
              We've sent a verification link to
              {email && (
                <span className="block font-medium text-foreground mt-1">{email}</span>
              )}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary" />
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Click the verification link</p>
                <p className="text-xs text-muted-foreground">
                  Open the email and click the verification link to activate your account
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground">2</span>
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Sign in to your account</p>
                <p className="text-xs text-muted-foreground">
                  After verification, you can sign in and start using PeepoPay
                </p>
              </div>
            </div>
          </div>

          {resendStatus && (
            <div
              className={`p-3 text-sm rounded-md border ${
                resendStatus.type === 'success'
                  ? 'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-900'
                  : 'text-destructive bg-destructive/10 border-destructive'
              }`}
            >
              <div className="flex items-start gap-2">
                {resendStatus.type === 'success' ? (
                  <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                )}
                <span>{resendStatus.message}</span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              Didn't receive the email? Check your spam folder or
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={isResending || countdown > 0 || !email}
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : countdown > 0 ? (
                `Resend in ${countdown}s`
              ) : (
                'Resend verification email'
              )}
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <div className="w-full border-t pt-4">
            <p className="text-sm text-muted-foreground text-center">
              Wrong email address?{' '}
              <Link href="/auth/signup" className="text-primary hover:underline font-medium">
                Sign up again
              </Link>
            </p>
          </div>
          <div className="w-full">
            <p className="text-sm text-muted-foreground text-center">
              Already verified?{' '}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
