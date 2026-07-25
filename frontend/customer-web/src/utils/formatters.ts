const assertFiniteNumber = (value: number, name: string): void => {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number`);
  }
};

export const formatCurrency = (
  amount: number,
  locale = 'en-US',
  currency = 'EUR',
): string => {
  assertFiniteNumber(amount, 'amount');

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatDate = (
  value: string | Date,
  locale = 'de-DE',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  },
): string => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  return new Intl.DateTimeFormat(locale, options).format(date);
};

export const formatDistance = (meters: number): string => {
  assertFiniteNumber(meters, 'meters');

  if (meters < 0) {
    throw new RangeError('meters must not be negative');
  }

  if (meters >= 500) {
    const kilometers = Number((meters / 1000).toFixed(1));
    return `${kilometers} km`;
  }

  return `${meters} m`;
};

export const formatDuration = (minutes: number): string => {
  assertFiniteNumber(minutes, 'minutes');

  if (minutes < 0 || !Number.isInteger(minutes)) {
    throw new RangeError('minutes must be a non-negative integer');
  }

  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}min`;
  }

  return `${minutes} min`;
};

export const formatPhone = (phone: string): string => {
  const compactPhone = phone.replace(/\s/g, '');
  const austrianInternational = compactPhone.match(/^\+43(\d{3})(\d{7})$/);
  if (austrianInternational) {
    return `+43 ${austrianInternational[1]} ${austrianInternational[2]}`;
  }

  const austrianNational = compactPhone.match(/^0(\d{3})(\d{7})$/);
  if (austrianNational) {
    return `0${austrianNational[1]} ${austrianNational[2]}`;
  }

  const otherInternational = compactPhone.match(/^\+(\d{2})(\d{3})(\d{7})$/);
  if (otherInternational) {
    return `+${otherInternational[1]} ${otherInternational[2]} ${otherInternational[3]}`;
  }

  return phone;
};
