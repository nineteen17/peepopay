// Export all schemas
export * from './users.js';
export * from './services.js';
export * from './bookings.js';
export * from './availability.js';

// Re-export relations
import { servicesRelations } from './services.js';
import { bookingsRelations } from './bookings.js';
import { availabilityRelations, blockedSlotsRelations } from './availability.js';

export const relations = {
  servicesRelations,
  bookingsRelations,
  availabilityRelations,
  blockedSlotsRelations,
};
