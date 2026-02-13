// Mock QueryClient class
const QueryClient = jest.fn().mockImplementation(() => ({
  invalidateQueries: jest.fn(),
  setQueryData: jest.fn(),
  getQueryData: jest.fn(),
  removeQueries: jest.fn(),
  clear: jest.fn(),
}));

// Mock QueryClientProvider component
const QueryClientProvider = jest.fn().mockImplementation(({ children }) => children);

// Mock hooks
const useQuery = jest.fn(() => ({
  data: null,
  error: null,
  isLoading: false,
  isError: false,
  isSuccess: false,
  refetch: jest.fn(),
}));

const useInfiniteQuery = jest.fn(() => ({
  data: null,
  error: null,
  isLoading: false,
  isError: false,
  isSuccess: false,
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  refetch: jest.fn(),
}));

const useMutation = jest.fn(() => ({
  mutate: jest.fn(),
  mutateAsync: jest.fn(),
  isLoading: false,
  isError: false,
  isSuccess: false,
  error: null,
  data: null,
}));

const useQueryClient = jest.fn(() => ({
  invalidateQueries: jest.fn(),
  refetchQueries: jest.fn(),
  setQueryData: jest.fn(),
  getQueryData: jest.fn(),
  removeQueries: jest.fn(),
  clear: jest.fn(),
}));

export {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
};