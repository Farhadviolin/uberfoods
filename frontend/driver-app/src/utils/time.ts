/**
 * Time Utilities
 * For time calculations and formatting
 */

/**
 * Formats time in seconds to HH:MM:SS
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Parses time string (HH:MM:SS or HH:MM) to seconds
 */
export function parseTime(timeString: string): number {
  const parts = timeString.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 3600 + parts[1] * 60;
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

/**
 * Gets time difference in human-readable format
 */
export function getTimeDifference(start: Date, end: Date): string {
  const diffMs = end.getTime() - start.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} Tag${diffDays !== 1 ? 'e' : ''}`;
  }
  if (diffHours > 0) {
    return `${diffHours} Stunde${diffHours !== 1 ? 'n' : ''}`;
  }
  if (diffMinutes > 0) {
    return `${diffMinutes} Minute${diffMinutes !== 1 ? 'n' : ''}`;
  }
  return `${diffSeconds} Sekunde${diffSeconds !== 1 ? 'n' : ''}`;
}

/**
 * Checks if time is between two times
 */
export function isTimeBetween(time: Date, start: Date, end: Date): boolean {
  const timeMs = time.getTime();
  const startMs = start.getTime();
  const endMs = end.getTime();
  return timeMs >= startMs && timeMs <= endMs;
}

/**
 * Adds time to a date
 */
export function addTime(date: Date, hours: number, minutes: number = 0, seconds: number = 0): Date {
  const newDate = new Date(date);
  newDate.setHours(newDate.getHours() + hours);
  newDate.setMinutes(newDate.getMinutes() + minutes);
  newDate.setSeconds(newDate.getSeconds() + seconds);
  return newDate;
}

