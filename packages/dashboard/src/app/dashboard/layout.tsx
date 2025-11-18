'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/queries';
import { DashboardNav } from '@/components/dashboard-nav';
import { VerificationBanner } from '@/components/verification-banner';
import { OnboardingBanner } from '@/components/onboarding-banner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: authData, isLoading, error } = useAuth();
  const router = useRouter();
  const user = authData?.user;

  useEffect(() => {
    if (!isLoading && (!user || error)) {
      router.push('/auth/login');
    }
  }, [user, isLoading, error, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user || error) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/50">
      <DashboardNav />
      {user && !user.emailVerified && <VerificationBanner userEmail={user.email} />}
      {user && user.emailVerified && !user.stripeOnboardingComplete && <OnboardingBanner userName={user.name} />}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
