'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { User, CreditCard, Link as LinkIcon, Save, ExternalLink, CheckCircle, XCircle, Shield, DollarSign as DollarSignIcon } from 'lucide-react';
import type { Service } from '@/types/api';

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

  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [policyData, setPolicyData] = useState({
    cancellationWindowHours: 24,
    lateCancellationFee: 0,
    noShowFee: 0,
    allowPartialRefunds: true,
    autoRefundOnCancel: true,
    minimumCancellationHours: 2,
    flexPassEnabled: false,
    flexPassPrice: 0,
    flexPassRevenueSharePercent: 60,
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email,
        slug: user.slug || '',
      });
      fetchServices();
    }
  }, [user]);

  useEffect(() => {
    if (selectedService) {
      setPolicyData({
        cancellationWindowHours: selectedService.cancellationWindowHours || 24,
        lateCancellationFee: selectedService.lateCancellationFee || 0,
        noShowFee: selectedService.noShowFee || 0,
        allowPartialRefunds: selectedService.allowPartialRefunds ?? true,
        autoRefundOnCancel: selectedService.autoRefundOnCancel ?? true,
        minimumCancellationHours: selectedService.minimumCancellationHours || 2,
        flexPassEnabled: selectedService.flexPassEnabled || false,
        flexPassPrice: selectedService.flexPassPrice || 0,
        flexPassRevenueSharePercent: selectedService.flexPassRevenueSharePercent || 60,
      });
    }
  }, [selectedService]);

  const fetchServices = async () => {
    try {
      const response = await api.getServices();
      setServices(response.services || []);
      if (response.services && response.services.length > 0) {
        setSelectedService(response.services[0]);
      }
    } catch (err: any) {
      console.error('Failed to fetch services:', err);
    }
  };

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

  const handleUpdatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Convert dollar inputs to cents
      const policyUpdate = {
        cancellationWindowHours: policyData.cancellationWindowHours,
        lateCancellationFee: Math.round(policyData.lateCancellationFee * 100),
        noShowFee: Math.round(policyData.noShowFee * 100),
        allowPartialRefunds: policyData.allowPartialRefunds,
        autoRefundOnCancel: policyData.autoRefundOnCancel,
        minimumCancellationHours: policyData.minimumCancellationHours,
        flexPassEnabled: policyData.flexPassEnabled,
        flexPassPrice: policyData.flexPassEnabled ? Math.round(policyData.flexPassPrice * 100) : undefined,
        flexPassRevenueSharePercent: policyData.flexPassRevenueSharePercent,
      };

      await api.updateService(selectedService.id, policyUpdate);
      await fetchServices();
      setSuccess('Cancellation policy updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update policy');
    } finally {
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
          <TabsTrigger value="policies">
            <Shield className="mr-2 h-4 w-4" />
            Cancellation Policies
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

        {/* Policies Tab */}
        <TabsContent value="policies">
          {services.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  You need to create a service first before configuring cancellation policies.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Service Selector */}
              {services.length > 1 && (
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle>Select Service</CardTitle>
                    <CardDescription>
                      Choose which service to configure policies for
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {services.map((service) => (
                        <Button
                          key={service.id}
                          variant={selectedService?.id === service.id ? 'default' : 'outline'}
                          onClick={() => setSelectedService(service)}
                        >
                          {service.name}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Cancellation & Refund Policy</CardTitle>
                  <CardDescription>
                    Configure your cancellation policy for {selectedService?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdatePolicy} className="space-y-6">
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

                    {/* Cancellation Window */}
                    <div className="space-y-4 p-4 border rounded-lg">
                      <h3 className="font-semibold">Free Cancellation Window</h3>
                      <div className="space-y-2">
                        <Label htmlFor="cancellationWindowHours">
                          Cancellation Window (hours before booking)
                        </Label>
                        <Input
                          id="cancellationWindowHours"
                          type="number"
                          min="1"
                          max="168"
                          value={policyData.cancellationWindowHours}
                          onChange={(e) =>
                            setPolicyData({ ...policyData, cancellationWindowHours: parseInt(e.target.value) })
                          }
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Customers can cancel for a full refund up to this many hours before the booking
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="minimumCancellationHours">
                          Minimum Cancellation Notice (hours)
                        </Label>
                        <Input
                          id="minimumCancellationHours"
                          type="number"
                          min="0"
                          max="48"
                          value={policyData.minimumCancellationHours}
                          onChange={(e) =>
                            setPolicyData({ ...policyData, minimumCancellationHours: parseInt(e.target.value) })
                          }
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Customers cannot cancel within this many hours of the booking
                        </p>
                      </div>
                    </div>

                    {/* Fees */}
                    <div className="space-y-4 p-4 border rounded-lg">
                      <h3 className="font-semibold">Cancellation Fees</h3>
                      <div className="space-y-2">
                        <Label htmlFor="lateCancellationFee">
                          Late Cancellation Fee ($)
                        </Label>
                        <div className="flex items-center gap-2">
                          <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
                          <Input
                            id="lateCancellationFee"
                            type="number"
                            min="0"
                            step="0.01"
                            value={policyData.lateCancellationFee}
                            onChange={(e) =>
                              setPolicyData({ ...policyData, lateCancellationFee: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Fee charged for cancellations outside the free cancellation window
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="noShowFee">
                          No-Show Fee ($)
                        </Label>
                        <div className="flex items-center gap-2">
                          <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
                          <Input
                            id="noShowFee"
                            type="number"
                            min="0"
                            step="0.01"
                            value={policyData.noShowFee}
                            onChange={(e) =>
                              setPolicyData({ ...policyData, noShowFee: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Fee charged when customers don't show up for their booking
                        </p>
                      </div>
                    </div>

                    {/* Refund Settings */}
                    <div className="space-y-4 p-4 border rounded-lg">
                      <h3 className="font-semibold">Refund Settings</h3>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="allowPartialRefunds">Allow Partial Refunds</Label>
                          <p className="text-xs text-muted-foreground">
                            Allow partial refunds for late cancellations
                          </p>
                        </div>
                        <Switch
                          id="allowPartialRefunds"
                          checked={policyData.allowPartialRefunds}
                          onCheckedChange={(checked) =>
                            setPolicyData({ ...policyData, allowPartialRefunds: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="autoRefundOnCancel">Automatic Refunds</Label>
                          <p className="text-xs text-muted-foreground">
                            Automatically process refunds when bookings are cancelled
                          </p>
                        </div>
                        <Switch
                          id="autoRefundOnCancel"
                          checked={policyData.autoRefundOnCancel}
                          onCheckedChange={(checked) =>
                            setPolicyData({ ...policyData, autoRefundOnCancel: checked })
                          }
                        />
                      </div>
                    </div>

                    {/* Flex Pass */}
                    <div className="space-y-4 p-4 border rounded-lg bg-primary/5">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold">Cancellation Protection (Flex Pass)</h3>
                          <p className="text-xs text-muted-foreground">
                            Offer customers full refund protection for an additional fee
                          </p>
                        </div>
                        <Switch
                          id="flexPassEnabled"
                          checked={policyData.flexPassEnabled}
                          onCheckedChange={(checked) =>
                            setPolicyData({ ...policyData, flexPassEnabled: checked })
                          }
                        />
                      </div>

                      {policyData.flexPassEnabled && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="flexPassPrice">
                              Flex Pass Price ($)
                            </Label>
                            <div className="flex items-center gap-2">
                              <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
                              <Input
                                id="flexPassPrice"
                                type="number"
                                min="1"
                                step="0.01"
                                value={policyData.flexPassPrice}
                                onChange={(e) =>
                                  setPolicyData({ ...policyData, flexPassPrice: parseFloat(e.target.value) || 0 })
                                }
                                required={policyData.flexPassEnabled}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Additional fee customers pay for full refund protection
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="flexPassRevenueSharePercent">
                              Platform Revenue Share (%)
                            </Label>
                            <Input
                              id="flexPassRevenueSharePercent"
                              type="number"
                              min="60"
                              max="70"
                              value={policyData.flexPassRevenueSharePercent}
                              onChange={(e) =>
                                setPolicyData({ ...policyData, flexPassRevenueSharePercent: parseInt(e.target.value) })
                              }
                              required={policyData.flexPassEnabled}
                            />
                            <p className="text-xs text-muted-foreground">
                              Platform keeps {policyData.flexPassRevenueSharePercent}%, you receive{' '}
                              {100 - policyData.flexPassRevenueSharePercent}% (
                              ${((policyData.flexPassPrice * (100 - policyData.flexPassRevenueSharePercent)) / 100).toFixed(2)})
                            </p>
                          </div>

                          <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                            <p className="text-sm">
                              <strong>How it works:</strong> Customers pay an additional $
                              {policyData.flexPassPrice.toFixed(2)} at booking. If they cancel anytime before the
                              appointment, they receive a full refund of their deposit.
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Policy Preview */}
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-semibold mb-2">Policy Preview (Customer View)</h4>
                      <div className="text-sm space-y-1 text-muted-foreground">
                        <p>
                          ✓ Free cancellation up to {policyData.cancellationWindowHours} hours before booking
                        </p>
                        {policyData.lateCancellationFee > 0 && (
                          <p>
                            ⚠️ Late cancellation fee: ${policyData.lateCancellationFee.toFixed(2)}
                          </p>
                        )}
                        {policyData.noShowFee > 0 && (
                          <p>
                            ⚠️ No-show fee: ${policyData.noShowFee.toFixed(2)}
                          </p>
                        )}
                        {policyData.flexPassEnabled && (
                          <p>
                            🛡️ Cancellation protection available for ${policyData.flexPassPrice.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>

                    <Button type="submit" disabled={loading}>
                      <Save className="mr-2 h-4 w-4" />
                      {loading ? 'Saving...' : 'Save Policy'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </>
          )}
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
