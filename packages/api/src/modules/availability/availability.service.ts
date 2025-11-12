import { db } from '../../db/index.js';
import {
  availability,
  blockedSlots,
  bookings,
  users,
  type NewAvailability,
  type NewBlockedSlot,
  type DayOfWeek,
} from '../../db/schema/index.js';
import { eq, and, gte, lte, lt } from 'drizzle-orm';
import { AppError } from '../../middleware/errorHandler.js';
import { createCacheService, type CacheService } from '../../lib/redis.js';

interface TimeSlot {
  start: string; // ISO 8601 format
  end: string;
  available: boolean;
}

/**
 * Availability Service
 * Handles availability rules, blocked slots, and available slot calculation
 */
export class AvailabilityService {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = createCacheService();
  }

  /**
   * Get availability rules for a user
   */
  async getAvailabilityRules(userId: string) {
    return await db.query.availability.findMany({
      where: eq(availability.userId, userId),
      orderBy: (availability, { asc }) => [asc(availability.dayOfWeek), asc(availability.startTime)],
    });
  }

  /**
   * Create a new availability rule
   */
  async createAvailabilityRule(userId: string, data: Omit<NewAvailability, 'userId'>) {
    // Validate that end time is after start time
    if (data.endTime <= data.startTime) {
      throw new AppError(400, 'End time must be after start time');
    }

    // Validate break times if provided
    if (data.breakStart && data.breakEnd) {
      if (data.breakEnd <= data.breakStart) {
        throw new AppError(400, 'Break end time must be after break start time');
      }
      if (data.breakStart < data.startTime || data.breakEnd > data.endTime) {
        throw new AppError(400, 'Break times must be within availability window');
      }
    }

    const [newRule] = await db
      .insert(availability)
      .values({ ...data, userId })
      .returning();

    // Invalidate cache for this user
    await this.invalidateUserCache(userId);

    return newRule;
  }

  /**
   * Update an availability rule
   */
  async updateAvailabilityRule(ruleId: string, userId: string, data: Partial<Omit<NewAvailability, 'userId'>>) {
    // Verify ownership
    const existing = await db.query.availability.findFirst({
      where: and(eq(availability.id, ruleId), eq(availability.userId, userId)),
    });

    if (!existing) {
      throw new AppError(404, 'Availability rule not found');
    }

    // Validate times if provided
    const startTime = data.startTime || existing.startTime;
    const endTime = data.endTime || existing.endTime;

    if (endTime <= startTime) {
      throw new AppError(400, 'End time must be after start time');
    }

    const [updated] = await db
      .update(availability)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(availability.id, ruleId))
      .returning();

    await this.invalidateUserCache(userId);

    return updated;
  }

  /**
   * Delete an availability rule
   */
  async deleteAvailabilityRule(ruleId: string, userId: string) {
    const existing = await db.query.availability.findFirst({
      where: and(eq(availability.id, ruleId), eq(availability.userId, userId)),
    });

    if (!existing) {
      throw new AppError(404, 'Availability rule not found');
    }

    await db.delete(availability).where(eq(availability.id, ruleId));
    await this.invalidateUserCache(userId);

    return { success: true, message: 'Availability rule deleted' };
  }

  /**
   * Create a blocked slot
   */
  async createBlockedSlot(userId: string, data: Omit<NewBlockedSlot, 'userId'>) {
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    if (endTime <= startTime) {
      throw new AppError(400, 'End time must be after start time');
    }

    const [newSlot] = await db
      .insert(blockedSlots)
      .values({ ...data, userId, startTime, endTime })
      .returning();

    await this.invalidateUserCache(userId);

    return newSlot;
  }

  /**
   * Delete a blocked slot
   */
  async deleteBlockedSlot(slotId: string, userId: string) {
    const existing = await db.query.blockedSlots.findFirst({
      where: and(eq(blockedSlots.id, slotId), eq(blockedSlots.userId, userId)),
    });

    if (!existing) {
      throw new AppError(404, 'Blocked slot not found');
    }

    await db.delete(blockedSlots).where(eq(blockedSlots.id, slotId));
    await this.invalidateUserCache(userId);

    return { success: true, message: 'Blocked slot deleted' };
  }

  /**
   * Get blocked slots for a user within a date range
   */
  async getBlockedSlots(userId: string, startDate: Date, endDate: Date) {
    return await db.query.blockedSlots.findMany({
      where: and(
        eq(blockedSlots.userId, userId),
        gte(blockedSlots.startTime, startDate),
        lte(blockedSlots.endTime, endDate)
      ),
      orderBy: (blockedSlots, { asc }) => [asc(blockedSlots.startTime)],
    });
  }

  /**
   * Get available slots for a service provider on a specific date
   * This is the core business logic for slot calculation
   */
  async getAvailableSlots(slug: string, date: string, serviceDuration: number): Promise<TimeSlot[]> {
    // Check cache first
    const cacheKey = `slots:${slug}:${date}:${serviceDuration}`;
    const cached = await this.cacheService.get<TimeSlot[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // 1. Get user by slug
    const user = await db.query.users.findFirst({
      where: eq(users.slug, slug),
    });

    if (!user) {
      throw new AppError(404, 'Service provider not found');
    }

    // 2. Parse the date and determine day of week
    const requestedDate = new Date(date);
    const dayOfWeek = this.getDayOfWeekString(requestedDate.getDay());

    // 3. Get availability rules for this day
    const rules = await db.query.availability.findMany({
      where: and(
        eq(availability.userId, user.id),
        eq(availability.dayOfWeek, dayOfWeek)
      ),
    });

    if (rules.length === 0) {
      // No availability rules for this day
      return [];
    }

    // 4. Get existing bookings for this date
    const startOfDay = new Date(requestedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(requestedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBookings = await db.query.bookings.findMany({
      where: and(
        eq(bookings.userId, user.id),
        gte(bookings.bookingDate, startOfDay),
        lte(bookings.bookingDate, endOfDay),
        // Only consider confirmed and pending bookings
        eq(bookings.status, 'confirmed') // TODO: Also check for 'pending'
      ),
      with: {
        service: true,
      },
    });

    // 5. Get blocked slots for this date
    const blocked = await this.getBlockedSlots(user.id, startOfDay, endOfDay);

    // 6. Calculate available slots
    const allSlots: TimeSlot[] = [];
    const now = new Date();

    for (const rule of rules) {
      const slots = this.generateSlotsForRule(
        requestedDate,
        rule,
        serviceDuration,
        existingBookings,
        blocked,
        now
      );
      allSlots.push(...slots);
    }

    // 7. Sort slots chronologically
    allSlots.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    // 8. Cache for 5 minutes
    await this.cacheService.set(cacheKey, allSlots, 300);

    return allSlots;
  }

  /**
   * Check if a specific slot is available
   */
  async isSlotAvailable(userId: string, startTime: Date, duration: number): Promise<boolean> {
    const endTime = new Date(startTime.getTime() + duration * 60000);

    // Check for booking conflicts
    const conflicts = await db.query.bookings.findMany({
      where: and(
        eq(bookings.userId, userId),
        gte(bookings.bookingDate, startTime),
        lt(bookings.bookingDate, endTime)
      ),
    });

    if (conflicts.length > 0) {
      return false;
    }

    // Check for blocked slots
    const blocked = await db.query.blockedSlots.findMany({
      where: and(
        eq(blockedSlots.userId, userId),
        lte(blockedSlots.startTime, endTime),
        gte(blockedSlots.endTime, startTime)
      ),
    });

    return blocked.length === 0;
  }

  /**
   * Generate time slots for a specific availability rule
   */
  private generateSlotsForRule(
    date: Date,
    rule: typeof availability.$inferSelect,
    serviceDuration: number,
    existingBookings: any[],
    blockedSlots: any[],
    now: Date
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const [startHour, startMinute] = rule.startTime.split(':').map(Number);
    const [endHour, endMinute] = rule.endTime.split(':').map(Number);

    let currentSlotStart = new Date(date);
    currentSlotStart.setHours(startHour, startMinute, 0, 0);

    const ruleEndTime = new Date(date);
    ruleEndTime.setHours(endHour, endMinute, 0, 0);

    // Handle break times
    let breakStart: Date | null = null;
    let breakEnd: Date | null = null;
    if (rule.breakStart && rule.breakEnd) {
      const [breakStartHour, breakStartMinute] = rule.breakStart.split(':').map(Number);
      const [breakEndHour, breakEndMinute] = rule.breakEnd.split(':').map(Number);
      breakStart = new Date(date);
      breakStart.setHours(breakStartHour, breakStartMinute, 0, 0);
      breakEnd = new Date(date);
      breakEnd.setHours(breakEndHour, breakEndMinute, 0, 0);
    }

    while (currentSlotStart < ruleEndTime) {
      const slotEnd = new Date(currentSlotStart.getTime() + serviceDuration * 60000);

      // Check if slot extends beyond rule end time
      if (slotEnd > ruleEndTime) {
        break;
      }

      // Check if slot is in the past
      if (currentSlotStart <= now) {
        currentSlotStart = new Date(currentSlotStart.getTime() + serviceDuration * 60000);
        continue;
      }

      // Check if slot overlaps with break time
      if (breakStart && breakEnd) {
        if (this.timeSlotsOverlap(currentSlotStart, slotEnd, breakStart, breakEnd)) {
          currentSlotStart = new Date(currentSlotStart.getTime() + serviceDuration * 60000);
          continue;
        }
      }

      // Check if slot is already booked
      const isBooked = existingBookings.some((booking) => {
        const bookingStart = new Date(booking.bookingDate);
        const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 60000);
        return this.timeSlotsOverlap(currentSlotStart, slotEnd, bookingStart, bookingEnd);
      });

      // Check if slot is blocked
      const isBlocked = blockedSlots.some((blocked) => {
        return this.timeSlotsOverlap(
          currentSlotStart,
          slotEnd,
          new Date(blocked.startTime),
          new Date(blocked.endTime)
        );
      });

      slots.push({
        start: currentSlotStart.toISOString(),
        end: slotEnd.toISOString(),
        available: !isBooked && !isBlocked,
      });

      currentSlotStart = new Date(currentSlotStart.getTime() + serviceDuration * 60000);
    }

    return slots;
  }

  /**
   * Check if two time slots overlap
   */
  private timeSlotsOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1 < end2 && end1 > start2;
  }

  /**
   * Convert JS day of week (0-6) to our enum string
   */
  private getDayOfWeekString(jsDay: number): DayOfWeek {
    const mapping: DayOfWeek[] = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    return mapping[jsDay];
  }

  /**
   * Invalidate cache for a user
   */
  private async invalidateUserCache(userId: string) {
    // Get user to find their slug
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (user?.slug) {
      // Delete all cached slots for this user
      await this.cacheService.deletePattern(`slots:${user.slug}:*`);
    }
  }
}
