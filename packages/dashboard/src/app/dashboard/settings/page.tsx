'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { User, CreditCard, Link as LinkIcon, Save, ExternalLink, CheckCircle, XCircle } from 'lucide-react';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    slug: '',
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name,
        email: user.email,
        slug: user.slug,
      });
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.updateProfile(profileData);
      await refreshUser();
      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleStripeOnboarding = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.startStripeOnboarding();
      window.location.href = response.url;
    } catch (err: any) {
      setError(err.message || 'Failed to start Stripe onboarding');
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="stripe">
            <CreditCard className="mr-2 h-4 w-4" />
            Stripe Account
          </TabsTrigger>
          <TabsTrigger value="booking">
            <LinkIcon className="mr-2 h-4 w-4" />
            Booking Page
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive rounded-md">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
                    {success}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setProfileData({
                        ...profileData,
                        name,
                        slug: profileData.slug || generateSlug(name),
                      });
                    }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) =>
                      setProfileData({ ...profileData, email: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Booking Page Slug</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">peepopay.com/</span>
                    <Input
                      id="slug"
                      value={profileData.slug}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          slug: generateSlug(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This is your unique booking page URL
                  </p>
                </div>

                <Button type="submit" disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stripe Tab */}
        <TabsContent value="stripe">
          <Card>
            <CardHeader>
              <CardTitle>Stripe Connect Account</CardTitle>
              <CardDescription>
                Manage your payment account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <div className="font-medium">Account Status</div>
                  <div className="text-sm text-muted-foreground">
                    {user?.stripeOnboardingComplete
                      ? 'Your Stripe account is connected and active'
                      : 'Your Stripe account is not fully set up'}
                  </div>
                </div>
                {user?.stripeOnboardingComplete ? (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="warning" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Incomplete
                  </Badge>
                )}
              </div>

              {user?.stripeAccountId && (
                <div className="space-y-2">
                  <Label>Stripe Account ID</Label>
                  <div className="p-3 bg-muted rounded-md">
                    <code className="text-sm">{user.stripeAccountId}</code>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="font-semibold">Payment Details</h3>
                <div className="grid gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform Fee</span>
                    <span className="font-medium">2.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Processing</span>
                    <span className="font-medium">Handled by Stripe</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payout Destination</span>
                    <span className="font-medium">Your Stripe Account</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button onClick={handleStripeOnboarding} disabled={loading}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {user?.stripeOnboardingComplete
                    ? 'Manage Stripe Account'
                    : 'Complete Stripe Setup'}
                </Button>
              </div>

              {!user?.stripeOnboardingComplete && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    You need to complete your Stripe account setup to start accepting payments.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Booking Page Tab */}
        <TabsContent value="booking">
          <Card>
            <CardHeader>
              <CardTitle>Booking Page</CardTitle>
              <CardDescription>
                Your customer-facing booking page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Booking Page URL</Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <code className="text-sm flex-1">
                    https://peepopay.com/{user?.slug}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`https://peepopay.com/${user?.slug}`);
                      setSuccess('URL copied to clipboard!');
                      setTimeout(() => setSuccess(''), 3000);
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this link with your customers to receive bookings
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">How to use your booking page</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-primary">1.</span>
                    <span>Share your booking page URL with customers via email, social media, or your website</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-primary">2.</span>
                    <span>Customers select a service, choose a date and time, and make payment</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-primary">3.</span>
                    <span>You receive instant notifications and bookings appear in your dashboard</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-primary">4.</span>
                    <span>Money flows directly to your Stripe account (minus the 2.5% platform fee)</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <h4 className="font-medium mb-2">Embed on your website</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  You can also embed the booking widget directly on your website using our JavaScript widget.
                </p>
                <div className="p-3 bg-muted rounded-md">
                  <code className="text-xs break-all">
                    {`<script src="https://peepopay.com/widget.js"></script>\n<div data-peepopay-widget="${user?.slug}"></div>`}
                  </code>
                </div>
              </div>

              {success && (
                <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
                  {success}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
