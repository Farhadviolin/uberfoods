import { renderHook } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { useAutomationData } from '../useAutomationData';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

describe('useAutomationData Hook', () => {
  beforeEach(() => {
    (useQuery as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns automation data when loaded', async () => {
    const mockRefetch = jest.fn();
    (useQuery as jest.Mock)
      .mockReturnValueOnce({ data: [{ id: 'w1' }], isLoading: false, error: null, refetch: mockRefetch })
      .mockReturnValueOnce({ data: [{ id: 'r1' }], isLoading: false, error: null, refetch: mockRefetch })
      .mockReturnValueOnce({ data: [{ id: 't1' }], isLoading: false, error: null, refetch: mockRefetch })
      .mockReturnValueOnce({ data: [{ id: 's1' }], isLoading: false, error: null, refetch: mockRefetch })
      .mockReturnValueOnce({ data: [{ id: 'l1' }], isLoading: false, error: null, refetch: mockRefetch });

    const { result } = renderHook(() => useAutomationData());

    expect(result.current.workflows).toHaveLength(1);
    expect(result.current.rules).toHaveLength(1);
    expect(result.current.triggers).toHaveLength(1);
    expect(result.current.scheduledTasks).toHaveLength(1);
    expect(result.current.executionLogs).toHaveLength(1);
  });

  it('calls automation endpoints', async () => {
    (useQuery as jest.Mock)
      .mockReturnValueOnce({ data: [], isLoading: false, error: null, refetch: jest.fn() })
      .mockReturnValueOnce({ data: [], isLoading: false, error: null, refetch: jest.fn() })
      .mockReturnValueOnce({ data: [], isLoading: false, error: null, refetch: jest.fn() })
      .mockReturnValueOnce({ data: [], isLoading: false, error: null, refetch: jest.fn() })
      .mockReturnValueOnce({ data: [], isLoading: false, error: null, refetch: jest.fn() });

    renderHook(() => useAutomationData());

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['automation', 'workflows'] })
    );
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['automation', 'rules'] })
    );
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['automation', 'triggers'] })
    );
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['automation', 'scheduled'] })
    );
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['automation', 'logs'] })
    );
  });
});
