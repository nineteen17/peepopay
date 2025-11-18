import axios, { AxiosInstance, AxiosResponse } from 'axios';
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
  HealthResponse,
} from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export class ApiClient {
  private client: AxiosInstance;

  constructor(baseUrl: string = API_URL) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Important for auth cookies
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const message = error.response?.data?.message || error.message || 'An error occurred';
        throw new Error(message);
      }
    );
  }

  private async request<T>(endpoint: string, options?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.request({
      url: endpoint,
      ...options,
    });
    return response.data;
  }

  // Auth
  async login(email: string, password: string): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/sign-in/email', {
      method: 'POST',
      data: { email, password },
    });
  }

  async signup(data: {
    email: string;
    password: string;
    name: string;
    slug: string;
    industryVertical?: string;
    industrySubcategory?: string;
  }): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/sign-up/email', {
      method: 'POST',
      data,
    });
  }

  async logout(): Promise<void> {
    return this.request<void>('/api/auth/sign-out', { method: 'POST' });
  }

  async resendVerificationEmail(email: string): Promise<{ status: boolean }> {
    return this.request<{ status: boolean }>('/api/auth/send-verification-email', {
      method: 'POST',
      data: { email },
    });
  }

  // User
  async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/users/me');
  }

  async updateProfile(data: Partial<User>): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/users/me', {
      method: 'PUT',
      data,
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
      data,
    });
  }

  async updateService(id: string, data: Partial<NewService>): Promise<ServiceResponse> {
    return this.request<ServiceResponse>(`/api/services/${id}`, {
      method: 'PUT',
      data,
    });
  }

  async deleteService(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/services/${id}`, {
      method: 'DELETE',
    });
  }

  // Bookings
  async getBookings(params?: { status?: string; from?: string; to?: string }): Promise<BookingListResponse> {
    return this.request<BookingListResponse>('/api/bookings', {
      params,
    });
  }

  async getBooking(id: string): Promise<BookingResponse> {
    return this.request<BookingResponse>(`/api/bookings/${id}`);
  }

  async updateBookingStatus(id: string, status: Booking['status']): Promise<BookingResponse> {
    return this.request<BookingResponse>(`/api/bookings/${id}/status`, {
      method: 'PATCH',
      data: { status },
    });
  }

  async cancelBooking(id: string): Promise<BookingResponse> {
    return this.request<BookingResponse>(`/api/bookings/${id}/cancel`, {
      method: 'POST',
    });
  }

  // Health
  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }
}

export const api = new ApiClient();
