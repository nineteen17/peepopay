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
  async login(email: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async signup(data: { email: string; password: string; name: string; slug: string }) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout() {
    return this.request('/api/auth/logout', { method: 'POST' });
  }

  // User
  async getMe() {
    return this.request('/api/users/me');
  }

  async updateProfile(data: any) {
    return this.request('/api/users/me', {
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
  async getServices() {
    return this.request('/api/services');
  }

  async getService(id: string) {
    return this.request(`/api/services/${id}`);
  }

  async createService(data: any) {
    return this.request('/api/services', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateService(id: string, data: any) {
    return this.request(`/api/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteService(id: string) {
    return this.request(`/api/services/${id}`, {
      method: 'DELETE',
    });
  }

  // Bookings
  async getBookings(params?: { status?: string; from?: string; to?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/api/bookings${query ? `?${query}` : ''}`);
  }

  async getBooking(id: string) {
    return this.request(`/api/bookings/${id}`);
  }

  async updateBookingStatus(id: string, status: string) {
    return this.request(`/api/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async cancelBooking(id: string) {
    return this.request(`/api/bookings/${id}/cancel`, {
      method: 'POST',
    });
  }
}

export const api = new ApiClient();
