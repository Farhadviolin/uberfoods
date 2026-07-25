import { waitFor } from '@testing-library/react';
import { renderHook } from '../../test-utils';
import { useUIPreferences, useUpdateUIPreferences } from '../useUIPreferences';

jest.mock('../../utils/env', () => ({
  getEnvVar: jest.fn(),
}));
const { getEnvVar: mockGetEnvVar } = jest.requireMock<typeof import('../../utils/env')>('../../utils/env');

// Mock the API
jest.mock('../../utils/api');
const mockApi = jest.requireMock<typeof import('../../utils/api')>('../../utils/api');

describe('useUIPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEnvVar.mockReturnValue(undefined);
  });

  it('fetches UI preferences when authenticated', async () => {
    const mockPreferences = {
      theme: 'dark',
      language: 'de',
      notifications: true,
      compactView: false,
    };

    mockApi.get.mockResolvedValueOnce({ data: mockPreferences });

    const { result } = renderHook(() => useUIPreferences());

    await waitFor(() => {
      expect(result.current.data).toEqual(mockPreferences);
    });
  });

  it('returns default preferences when not authenticated', async () => {
    const { result } = renderHook(() => useUIPreferences());

    await waitFor(() => {
      expect(result.current.data).toEqual({
        theme: 'light',
        language: 'en',
        notifications: true,
        compactView: false,
      });
    });
  });
});

describe('useUpdateUIPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates UI preferences successfully', async () => {
    const updateData = { theme: 'dark', compactView: true };
    mockApi.put.mockResolvedValueOnce({ data: updateData });

    const { result } = renderHook(() => useUpdateUIPreferences());

    result.current.mutate(updateData);

    await waitFor(() => {
      expect(mockApi.put).toHaveBeenCalledWith('/customers/me/ui-preferences', updateData);
      expect(result.current.isSuccess).toBe(true);
    });
  });
});







