'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { Calendar, Clock, DollarSign, Mail, User, Phone, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Booking {
  id: string;
  serviceName: string;
  servicePrice: number;
  serviceDuration: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  scheduledFor: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  totalAmount: number;
  platformFee: number;
  paymentStatus: string;
  createdAt: string;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await api.getBookings({});
      setBookings(response.bookings || []);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (bookingId: string, status: string) => {
    try {
      await api.updateBookingStatus(bookingId, status);
      await fetchBookings();
      setDialogOpen(false);
    } catch (error: any) {
      alert(error.message || 'Failed to update booking status');
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      await api.cancelBooking(bookingId);
      await fetchBookings();
      setDialogOpen(false);
    } catch (error: any) {
      alert(error.message || 'Failed to cancel booking');
    }
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

  const filterBookings = (status: string) => {
    if (status === 'all') return bookings;
    return bookings.filter((b) => b.status === status);
  };

  const BookingCard = ({ booking }: { booking: Booking }) => (
    <Card
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => {
        setSelectedBooking(booking);
        setDialogOpen(true);
      }}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {booking.customerName}
              {getStatusBadge(booking.status)}
            </CardTitle>
            <CardDescription className="mt-2">
              {booking.serviceName}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(booking.scheduledFor), 'EEEE, MMMM dd, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{format(new Date(booking.scheduledFor), 'h:mm a')} ({booking.serviceDuration} min)</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span className="font-medium text-foreground">
              ${(booking.totalAmount / 100).toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading bookings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bookings</h1>
        <p className="text-muted-foreground mt-1">
          Manage all your customer bookings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All ({bookings.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({filterBookings('pending').length})
          </TabsTrigger>
          <TabsTrigger value="confirmed">
            Confirmed ({filterBookings('confirmed').length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({filterBookings('completed').length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled ({filterBookings('cancelled').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filterBookings(activeTab).length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">No bookings found</p>
                  <p className="text-sm mt-1">
                    {activeTab === 'all'
                      ? 'You have no bookings yet'
                      : `You have no ${activeTab} bookings`}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filterBookings(activeTab).map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              View and manage this booking
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <span className="font-medium">Status</span>
                {getStatusBadge(selectedBooking.status)}
              </div>

              {/* Customer Information */}
              <div className="space-y-3">
                <h3 className="font-semibold">Customer Information</h3>
                <div className="grid gap-3">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedBooking.customerName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedBooking.customerEmail}</span>
                  </div>
                  {selectedBooking.customerPhone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedBooking.customerPhone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Service Details */}
              <div className="space-y-3">
                <h3 className="font-semibold">Service Details</h3>
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="font-medium">{selectedBooking.serviceName}</div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {selectedBooking.serviceDuration} minutes
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      ${(selectedBooking.servicePrice / 100).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedule */}
              <div className="space-y-3">
                <h3 className="font-semibold">Schedule</h3>
                <div className="p-4 border rounded-lg">
                  <div className="text-lg font-medium">
                    {format(new Date(selectedBooking.scheduledFor), 'EEEE, MMMM dd, yyyy')}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {format(new Date(selectedBooking.scheduledFor), 'h:mm a')}
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="space-y-3">
                <h3 className="font-semibold">Payment</h3>
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Service Price</span>
                    <span className="text-sm font-medium">
                      ${(selectedBooking.servicePrice / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Platform Fee (2.5%)</span>
                    <span className="text-sm font-medium">
                      ${(selectedBooking.platformFee / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-medium">Total</span>
                    <span className="font-bold">
                      ${(selectedBooking.totalAmount / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-sm text-muted-foreground">Payment Status</span>
                    <Badge variant={selectedBooking.paymentStatus === 'succeeded' ? 'success' : 'warning'}>
                      {selectedBooking.paymentStatus}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {selectedBooking.status !== 'cancelled' && selectedBooking.status !== 'completed' && (
                <div className="flex gap-2 pt-4">
                  {selectedBooking.status === 'pending' && (
                    <Button
                      onClick={() => handleStatusUpdate(selectedBooking.id, 'confirmed')}
                      className="flex-1"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Confirm Booking
                    </Button>
                  )}
                  {selectedBooking.status === 'confirmed' && (
                    <Button
                      onClick={() => handleStatusUpdate(selectedBooking.id, 'completed')}
                      className="flex-1"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark as Completed
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={() => handleCancelBooking(selectedBooking.id)}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
