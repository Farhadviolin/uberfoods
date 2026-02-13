import { renderHook } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { useReportingData } from '../useReportingData';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

describe('useReportingData Hook', () => {
  beforeEach(() => {
    (useQuery as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns reporting data when loaded', async () => {
    const mockRefetch = jest.fn();
    (useQuery as jest.Mock)
      .mockReturnValueOnce({ data: [{ id: 'r1' }], isLoading: false, error: null, refetch: mockRefetch })
      .mockReturnValueOnce({ data: [{ id: 'd1' }], isLoading: false, error: null, refetch: mockRefetch })
      .mockReturnValueOnce({ data: [{ id: 's1' }], isLoading: false, error: null, refetch: mockRefetch });

    const { result } = renderHook(() => useReportingData());

    expect(result.current.reports).toHaveLength(1);
    expect(result.current.dashboards).toHaveLength(1);
    expect(result.current.scheduledReports).toHaveLength(1);
  });

  it('calls reporting endpoints', async () => {
    (useQuery as jest.Mock)
      .mockReturnValueOnce({ data: [], isLoading: false, error: null, refetch: jest.fn() })
      .mockReturnValueOnce({ data: [], isLoading: false, error: null, refetch: jest.fn() })
      .mockReturnValueOnce({ data: [], isLoading: false, error: null, refetch: jest.fn() });

    renderHook(() => useReportingData());

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['reporting', 'reports'] })
    );
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['reporting', 'dashboards'] })
    );
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['reporting', 'scheduled'] })
    );
  });
});
