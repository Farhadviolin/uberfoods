import { 
  formatCurrency, 
  formatDate, 
  formatDistance,
  formatDuration,
  formatPhone 
} from '../formatters';

describe('Formatter Utils', () => {
  describe('formatCurrency', () => {
    it('should format EUR currency', () => {
      expect(formatCurrency(25.50)).toBe('€25.50');
      expect(formatCurrency(1234.56)).toBe('€1,234.56');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('€0.00');
    });

    it('should handle negative values', () => {
      expect(formatCurrency(-15.50)).toBe('-€15.50');
    });

    it('should round to 2 decimals', () => {
      expect(formatCurrency(10.999)).toBe('€11.00');
    });
  });

  describe('formatDate', () => {
    it('should format date to German locale', () => {
      const date = new Date('2025-12-11T15:30:00Z');
      const result = formatDate(date);

      expect(result).toContain('11');
      expect(result).toContain('12');
      expect(result).toContain('2025');
    });

    it('should handle date strings', () => {
      const result = formatDate('2025-12-11T15:30:00Z');

      expect(result).toContain('11');
    });

    it('should handle invalid dates', () => {
      const result = formatDate('invalid');

      expect(result).toBe('Invalid Date');
    });
  });

  describe('formatDistance', () => {
    it('should format meters to km', () => {
      expect(formatDistance(1500)).toBe('1.5 km');
      expect(formatDistance(500)).toBe('0.5 km');
    });

    it('should show meters for short distances', () => {
      expect(formatDistance(250)).toBe('250 m');
      expect(formatDistance(50)).toBe('50 m');
    });

    it('should handle zero', () => {
      expect(formatDistance(0)).toBe('0 m');
    });
  });

  describe('formatDuration', () => {
    it('should format minutes', () => {
      expect(formatDuration(15)).toBe('15 min');
      expect(formatDuration(60)).toBe('60 min');
    });

    it('should format hours', () => {
      expect(formatDuration(90)).toBe('1h 30min');
      expect(formatDuration(120)).toBe('2h 0min');
    });

    it('should handle zero', () => {
      expect(formatDuration(0)).toBe('0 min');
    });
  });

  describe('formatPhone', () => {
    it('should format Austrian phone numbers', () => {
      expect(formatPhone('+436641234567')).toBe('+43 664 1234567');
      expect(formatPhone('06641234567')).toBe('0664 1234567');
    });

    it('should handle international format', () => {
      expect(formatPhone('+491234567890')).toBe('+49 123 4567890');
    });

    it('should return original if invalid', () => {
      expect(formatPhone('invalid')).toBe('invalid');
    });
  });
});
