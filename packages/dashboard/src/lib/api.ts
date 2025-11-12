import type {
  User,
  Service,
  NewService,
  Booking,
  NewBooking,
  ServiceListResponse,
  ServiceResponse,
  BookingListResponse,
  BookingResponse,
} from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'include', // Important for auth cookies
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async signup(data: { email: string; password: string; name: string; slug: string }): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<void> {
    return this.request<void>('/api/auth/logout', { method: 'POST' });
  }

  // User
  async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/users/me');
  }

  async updateProfile(data: Partial<User>): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async startStripeOnboarding() {
    return this.request<{ url: string }>('/api/users/stripe/onboard', {
      method: 'POST',
    });
  }

  // Services
  async getServices(): Promise<ServiceListResponse> {
    return this.request<ServiceListResponse>('/api/services');
  }

  async getService(id: string): Promise<ServiceResponse> {
    return this.request<ServiceResponse>(`/api/services/${id}`);
  }

  async createService(data: NewService): Promise<ServiceResponse> {
    return this.request<ServiceResponse>('/api/services', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateService(id: string, data: Partial<NewService>): Promise<ServiceResponse> {
    return this.request<ServiceResponse>(`/api/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteService(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/services/${id}`, {
      method: 'DELETE',
    });
  }

  // Bookings
  async getBookings(params?: { status?: string; from?: string; to?: string }): Promise<BookingListResponse> {
    const query = new URLSearchParams(params as any).toString();
    return this.request<BookingListResponse>(`/api/bookings${query ? `?${query}` : ''}`);
  }

  async getBooking(id: string): Promise<BookingResponse> {
    return this.request<BookingResponse>(`/api/bookings/${id}`);
  }

  async updateBookingStatus(id: string, status: Booking['status']): Promise<BookingResponse> {
    return this.request<BookingResponse>(`/api/bookings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async cancelBooking(id: string): Promise<BookingResponse> {
    return this.request<BookingResponse>(`/api/bookings/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
