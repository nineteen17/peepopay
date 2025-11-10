'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Clock, Save } from 'lucide-react';

interface TimeSlot {
  start: string;
  end: string;
}

interface DayAvailability {
  enabled: boolean;
  slots: TimeSlot[];
}

type WeekAvailability = {
  [key: string]: DayAvailability;
};

const daysOfWeek = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export default function AvailabilityPage() {
  const [availability, setAvailability] = useState<WeekAvailability>({
    monday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    tuesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    wednesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    thursday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    friday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    saturday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
    sunday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
  });
  const [saving, setSaving] = useState(false);

  const toggleDay = (day: string) => {
    setAvailability({
      ...availability,
      [day]: {
        ...availability[day],
        enabled: !availability[day].enabled,
      },
    });
  };

  const updateTimeSlot = (day: string, slotIndex: number, field: 'start' | 'end', value: string) => {
    const newSlots = [...availability[day].slots];
    newSlots[slotIndex][field] = value;
    setAvailability({
      ...availability,
      [day]: {
        ...availability[day],
        slots: newSlots,
      },
    });
  };

  const addTimeSlot = (day: string) => {
    setAvailability({
      ...availability,
      [day]: {
        ...availability[day],
        slots: [...availability[day].slots, { start: '09:00', end: '17:00' }],
      },
    });
  };

  const removeTimeSlot = (day: string, slotIndex: number) => {
    const newSlots = availability[day].slots.filter((_, index) => index !== slotIndex);
    setAvailability({
      ...availability,
      [day]: {
        ...availability[day],
        slots: newSlots.length > 0 ? newSlots : [{ start: '09:00', end: '17:00' }],
      },
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: Implement API call to save availability
      // await api.updateAvailability(availability);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      alert('Availability updated successfully!');
    } catch (error) {
      console.error('Failed to save availability:', error);
      alert('Failed to save availability. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const copyToAll = (sourceDay: string) => {
    const sourceConfig = availability[sourceDay];
    const newAvailability: WeekAvailability = {};

    daysOfWeek.forEach(({ key }) => {
      newAvailability[key] = {
        enabled: sourceConfig.enabled,
        slots: sourceConfig.slots.map(slot => ({ ...slot })),
      };
    });

    setAvailability(newAvailability);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Availability</h1>
          <p className="text-muted-foreground mt-1">
            Set your working hours for each day of the week
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
          <CardDescription>
            Configure when you're available to accept bookings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {daysOfWeek.map(({ key, label }) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={availability[key].enabled}
                    onCheckedChange={() => toggleDay(key)}
                  />
                  <Label className="text-base font-semibold cursor-pointer" onClick={() => toggleDay(key)}>
                    {label}
                  </Label>
                </div>
                {availability[key].enabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToAll(key)}
                  >
                    Copy to all days
                  </Button>
                )}
              </div>

              {availability[key].enabled && (
                <div className="ml-12 space-y-2">
                  {availability[key].slots.map((slot, slotIndex) => (
                    <div key={slotIndex} className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={slot.start}
                          onChange={(e) => updateTimeSlot(key, slotIndex, 'start', e.target.value)}
                          className="w-32"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={slot.end}
                          onChange={(e) => updateTimeSlot(key, slotIndex, 'end', e.target.value)}
                          className="w-32"
                        />
                      </div>
                      {availability[key].slots.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTimeSlot(key, slotIndex)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addTimeSlot(key)}
                  >
                    + Add time slot
                  </Button>
                </div>
              )}

              {!availability[key].enabled && (
                <div className="ml-12 text-sm text-muted-foreground">
                  Unavailable on {label}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Enable the days you want to accept bookings and set your working hours
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                You can add multiple time slots per day if you have breaks or split shifts
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Use "Copy to all days" to quickly apply the same schedule across the week
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Your availability will be used to show available time slots in the booking widget
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
