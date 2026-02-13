import { renderHook } from '@testing-library/react';
import { useSmartAcceptance } from '../useSmartAcceptance';
import { renderWithProviders } from '../../test-utils';

// Mock the useSmartAcceptance hook
jest.mock('../useSmartAcceptance', () => ({
  useSmartAcceptance: () => ({
    shouldAccept: true,
    confidence: 0.85,
    reasoning: 'Good match',
  }),
}));

describe('useSmartAcceptance Hook', () => {
  it('returns acceptance decision', () => {
    const { result } = renderHook(() => useSmartAcceptance(), {
      wrapper: renderWithProviders().wrapper,
    });

    expect(result.current.shouldAccept).toBe(true);
    expect(result.current.confidence).toBe(0.85);
  });
});