import { renderHook } from '../../test-utils';
import { useDashboardAnalytics } from '../useDashboardAnalytics';

describe('useDashboardAnalytics', () => {
  it('returns a defined result', () => {
    const { result } = renderHook(() => useDashboardAnalytics('test-user'));
    expect(result.current).toBeDefined();
  });
});