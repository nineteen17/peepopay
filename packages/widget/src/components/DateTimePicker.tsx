import { useState } from 'react';
import { format, addDays, isSameDay, set, startOfDay } from 'date-fns';
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

interface DateTimePickerProps {
  selectedDateTime: Date | null;
  onSelect: (date: Date) => void;
}

export default function DateTimePicker({ selectedDateTime, onSelect }: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(selectedDateTime);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfDay(new Date()));

  // Generate next 7 days
  const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Available time slots (9 AM to 5 PM, every hour)
  const timeSlots = Array.from({ length: 9 }, (_, i) => {
    const hour = 9 + i;
    return {
      hour,
      label: format(set(new Date(), { hours: hour, minutes: 0, seconds: 0 }), 'h:mm a'),
    };
  });

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleTimeSelect = (hour: number) => {
    if (!selectedDate) return;

    const dateTime = set(selectedDate, {
      hours: hour,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    });

    onSelect(dateTime);
  };

  const handlePrevWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, -7));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7));
  };

  return (
    <div className="space-y-6">
      {/* Date Selection */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Select Date
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handlePrevWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Previous week"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Next week"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isPast = day < startOfDay(new Date());

            return (
              <button
                key={day.toISOString()}
                onClick={() => !isPast && handleDateSelect(day)}
                disabled={isPast}
                className={`p-3 rounded-lg text-center transition-all ${
                  isPast
                    ? 'opacity-40 cursor-not-allowed'
                    : isSelected
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="text-xs font-medium">{format(day, 'EEE')}</div>
                <div className={`text-lg font-bold mt-1 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                  {format(day, 'd')}
                </div>
                <div className={`text-xs ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                  {format(day, 'MMM')}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Selection */}
      {selectedDate && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Select Time
          </h3>

          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map(({ hour, label }) => {
              const isSelected =
                selectedDateTime &&
                selectedDate &&
                isSameDay(selectedDate, selectedDateTime) &&
                selectedDateTime.getHours() === hour;

              return (
                <button
                  key={hour}
                  onClick={() => handleTimeSelect(hour)}
                  className={`p-3 rounded-lg text-center font-medium transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedDateTime && (
        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <div className="text-sm font-medium text-blue-900">Selected Time</div>
          <div className="text-lg font-bold text-blue-700 mt-1">
            {format(selectedDateTime, 'EEEE, MMMM d, yyyy')} at {format(selectedDateTime, 'h:mm a')}
          </div>
        </div>
      )}
    </div>
  );
}
