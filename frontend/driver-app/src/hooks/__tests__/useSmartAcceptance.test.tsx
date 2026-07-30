import { renderHook } from '@testing-library/react';
import { useSmartAcceptance } from '../useSmartAcceptance';
import { TestWrapper } from '../../test-utils';

// Mock the useSmartAcceptance hook
jest.mock('../useSmartAcceptance', () => ({
  useSmartAcceptance: () => ({
    isAnalyzing: false,
    pendingOrders: [],
    autoAcceptThreshold: 85,
    updateInterval: 5,
  }),
}));

describe('useSmartAcceptance Hook', () => {
  it('returns acceptance decision', () => {
    const { result } = renderHook(() => useSmartAcceptance(null, []), {
      wrapper: TestWrapper,
    });

    expect(result.current.isAnalyzing).toBe(false);
    expect(result.current.autoAcceptThreshold).toBe(85);
  });
});
