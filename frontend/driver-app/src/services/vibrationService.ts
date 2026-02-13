/**
 * Vibration Service
 * For device vibration (haptic feedback)
 */

class VibrationService {
  /**
   * Vibrates the device
   */
  vibrate(pattern: number | number[]): boolean {
    if (!('vibrate' in navigator)) {
      return false;
    }

    try {
      navigator.vibrate(pattern);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Short vibration (tap feedback)
   */
  tap(): boolean {
    return this.vibrate(10);
  }

  /**
   * Medium vibration
   */
  medium(): boolean {
    return this.vibrate(50);
  }

  /**
   * Long vibration
   */
  long(): boolean {
    return this.vibrate(200);
  }

  /**
   * Pattern vibration (e.g., [100, 50, 100] = vibrate, pause, vibrate)
   */
  pattern(pattern: number[]): boolean {
    return this.vibrate(pattern);
  }

  /**
   * Stops vibration
   */
  stop(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }
}

// Singleton instance
export const vibrationService = new VibrationService();

