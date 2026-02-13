// Vitest mock - provides vi API for tests
// This file is used when running tests with Vitest
export const vi = {
  fn: <T extends (...args: unknown[]) => unknown>(implementation?: T) => {
    return ((...args: Parameters<T>) => {
      if (implementation) {
        return implementation(...args);
      }
      return undefined;
    }) as T;
  },
  mock: () => undefined, // no-op to avoid module resolution errors
  spyOn: <T extends object, K extends keyof T>(obj: T, method: K) => {
    const original = obj[method];
    return {
      mockReturnValue: (value: unknown) => {
        (obj[method] as unknown) = () => value;
      },
      mockImplementation: (fn: unknown) => {
        (obj[method] as unknown) = fn;
      },
      restore: () => {
        obj[method] = original;
      },
    };
  },
  clearAllMocks: () => {
    // no-op
  },
  resetAllMocks: () => {
    // no-op
  },
};

export default { vi };

