'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
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

// Query Keys
export const queryKeys = {
  auth: ['auth'] as const,
  user: ['user'] as const,
  services: ['services'] as const,
  service: (id: string) => ['service', id] as const,
  bookings: (params?: { status?: string; from?: string; to?: string }) => 
    ['bookings', params] as const,
  booking: (id: string) => ['booking', id] as const,
  health: ['health'] as const,
} as const;

// Auth Queries
export function useAuth() {
  return useQuery({
    queryKey: queryKeys.auth,
    queryFn: () => api.getMe(),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Auth Mutations
export function useLogin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.login(email, password),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.auth, data);
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
    },
  });
}

export function useSignup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { email: string; password: string; name: string; slug: string }) =>
      api.signup(data),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.auth, data);
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

// User Queries
export function useUser() {
  return useQuery({
    queryKey: queryKeys.user,
    queryFn: () => api.getMe(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// User Mutations
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<User>) => api.updateProfile(data),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.user, data);
      queryClient.setQueryData(queryKeys.auth, data);
    },
  });
}

export function useStartStripeOnboarding() {
  return useMutation({
    mutationFn: () => api.startStripeOnboarding(),
  });
}

// Service Queries
export function useServices() {
  return useQuery({
    queryKey: queryKeys.services,
    queryFn: () => api.getServices(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useService(id: string) {
  return useQuery({
    queryKey: queryKeys.service(id),
    queryFn: () => api.getService(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Service Mutations
export function useCreateService() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: NewService) => api.createService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NewService> }) =>
      api.updateService(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services });
      queryClient.invalidateQueries({ queryKey: queryKeys.service(id) });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.deleteService(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services });
      queryClient.removeQueries({ queryKey: queryKeys.service(id) });
    },
  });
}

// Booking Queries
export function useBookings(params?: { status?: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: queryKeys.bookings(params),
    queryFn: () => api.getBookings(params),
    staleTime: 1000 * 60 * 1, // 1 minute
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: queryKeys.booking(id),
    queryFn: () => api.getBooking(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Booking Mutations
export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Booking['status'] }) =>
      api.updateBookingStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings() });
      queryClient.invalidateQueries({ queryKey: queryKeys.booking(id) });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.cancelBooking(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings() });
      queryClient.invalidateQueries({ queryKey: queryKeys.booking(id) });
    },
  });
}

// Health Queries
export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => api.getHealth(),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // 1 minute
  });
}