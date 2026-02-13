// Safe metadata access utilities
export class MetadataUtil {
  /**
   * Safely get a value from metadata JSON
   */
  static get<T>(metadata: any, key: string, defaultValue: T): T {
    if (!metadata || typeof metadata !== "object") {
      return defaultValue;
    }
    return (metadata as any)[key] ?? defaultValue;
  }

  /**
   * Safely set a value in metadata JSON (immutable)
   */
  static set(metadata: any, key: string, value: any): any {
    const safeMetadata = metadata ? { ...metadata } : {};
    (safeMetadata as any)[key] = value;
    return safeMetadata;
  }
}
