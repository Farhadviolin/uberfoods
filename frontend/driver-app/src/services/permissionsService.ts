/**
 * Permissions Service
 * For managing browser permissions
 */

export type PermissionName = 
  | 'camera'
  | 'microphone'
  | 'geolocation'
  | 'notifications'
  | 'persistent-storage'
  | 'push';

export type PermissionState = 'granted' | 'denied' | 'prompt';

class PermissionsService {
  /**
   * Requests a permission
   */
  async request(permission: PermissionName): Promise<PermissionState> {
    if (!('permissions' in navigator)) {
      // Fallback for browsers without Permissions API
      return this.requestFallback(permission);
    }

    try {
      const result = await navigator.permissions.query({ name: permission as PermissionDescriptor['name'] });
      return result.state as PermissionState;
    } catch (error) {
      return this.requestFallback(permission);
    }
  }

  /**
   * Checks permission status
   */
  async check(permission: PermissionName): Promise<PermissionState> {
    if (!('permissions' in navigator)) {
      return this.checkFallback(permission);
    }

    try {
      const result = await navigator.permissions.query({ name: permission as PermissionDescriptor['name'] });
      return result.state as PermissionState;
    } catch (error) {
      return this.checkFallback(permission);
    }
  }

  /**
   * Fallback for browsers without Permissions API
   */
  private async requestFallback(permission: PermissionName): Promise<PermissionState> {
    switch (permission) {
      case 'geolocation':
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve('granted'),
            () => resolve('denied'),
            { timeout: 1000 }
          );
        });
      case 'notifications':
        if ('Notification' in window) {
          const permission = Notification.permission;
          if (permission === 'default') {
            const result = await Notification.requestPermission();
            return result as PermissionState;
          }
          return permission as PermissionState;
        }
        return 'denied';
      default:
        return 'prompt';
    }
  }

  /**
   * Fallback check
   */
  private checkFallback(permission: PermissionName): PermissionState {
    switch (permission) {
      case 'notifications':
        if ('Notification' in window) {
          return Notification.permission as PermissionState;
        }
        return 'denied';
      default:
        return 'prompt';
    }
  }
}

// Singleton instance
export const permissionsService = new PermissionsService();

