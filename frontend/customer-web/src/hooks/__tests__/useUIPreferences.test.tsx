import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { useUIPreferences, useUpdateUIPreferences } from '../useUIPreferences';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the API
jest.mock('../../utils/api');
const mockApi = require('../../utils/api');

const createWrapper = ({ children }: { children: React.ReactNode }) => {
  return children;
};

describe('useUIPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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







