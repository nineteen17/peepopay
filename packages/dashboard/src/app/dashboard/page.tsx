'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { Calendar, DollarSign, Package, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface Booking {
  id: string;
  serviceName: string;
  customerName: string;
  customerEmail: string;
  scheduledFor: string;
  status: string;
  totalAmount: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [servicesData, bookingsData] = await Promise.all([
        api.getServices(),
        api.getBookings({ status: 'confirmed,completed' }),
      ]);
      setServices(servicesData.services || []);
      setBookings(bookingsData.bookings || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalBookings: bookings.length,
    upcomingBookings: bookings.filter((b) => b.status === 'confirmed').length,
    completedBookings: bookings.filter((b) => b.status === 'completed').length,
    totalRevenue: bookings
      .filter((b) => b.status === 'completed')
      .reduce((sum, b) => sum + b.totalAmount, 0),
    activeServices: services.filter((s) => s).length,
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'destructive' | 'default'> = {
      confirmed: 'success',
      pending: 'warning',
      completed: 'default',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.name}!</h1>
        <p className="text-muted-foreground mt-1">
          Here's an overview of your business
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.upcomingBookings} upcoming
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats.totalRevenue / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From {stats.completedBookings} completed bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Services</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeServices}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Services available for booking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalBookings > 0
                ? Math.round((stats.completedBookings / stats.totalBookings) * 100)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.completedBookings} of {stats.totalBookings} bookings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
          <CardDescription>
            Your latest customer bookings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No bookings yet</p>
              <p className="text-sm mt-1">
                Share your booking page to start receiving bookings
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.slice(0, 5).map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <div className="font-medium">{booking.customerName}</div>
                      <div className="text-sm text-muted-foreground">
                        {booking.serviceName}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {format(new Date(booking.scheduledFor), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(booking.scheduledFor), 'h:mm a')}
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      ${(booking.totalAmount / 100).toFixed(2)}
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Manage Services
            </CardTitle>
            <CardDescription>
              Add, edit, or remove services from your offering
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Set Availability
            </CardTitle>
            <CardDescription>
              Update your working hours and availability
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Booking Page Link */}
      {user?.slug && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Your Booking Page</CardTitle>
            <CardDescription>
              Share this link with your customers to receive bookings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-3 bg-background rounded-md border">
              <code className="text-sm flex-1">
                https://peepopay.com/{user.slug}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://peepopay.com/${user.slug}`);
                }}
                className="text-sm text-primary hover:underline"
              >
                Copy
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
