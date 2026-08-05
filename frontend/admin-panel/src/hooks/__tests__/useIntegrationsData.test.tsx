import { renderHook } from "@testing-library/react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useIntegrationsData } from "../useIntegrationsData";
import api from "../../utils/api";

jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn(),
  useQuery: jest.fn(),
  useQueryClient: jest.fn(),
}));
jest.mock("../../utils/api");

const mockApi = api as jest.Mocked<typeof api>;

describe("useIntegrationsData Hook", () => {
  beforeEach(() => {
    (useQueryClient as jest.Mock).mockReturnValue({ invalidateQueries: jest.fn() });
    (useMutation as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });
    (useQuery as jest.Mock).mockImplementation(() => ({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("keeps all four list contracts empty-safe", () => {
    const { result } = renderHook(() => useIntegrationsData());

    expect(result.current.available).toEqual([]);
    expect(result.current.connected).toEqual([]);
    expect(result.current.apiKeys).toEqual([]);
    expect(result.current.webhooks).toEqual([]);
    expect(useQuery).toHaveBeenCalledTimes(4);
  });

  it("registers the four initial integration query keys", () => {
    renderHook(() => useIntegrationsData());

    expect(useQuery).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ queryKey: ["integrations", "available"] }),
    );
    expect(useQuery).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ queryKey: ["integrations", "connected"] }),
    );
    expect(useQuery).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ queryKey: ["integrations", "api-keys"] }),
    );
    expect(useQuery).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ queryKey: ["integrations", "webhooks"] }),
    );
  });

  it("unwraps the full-app response envelope", async () => {
    mockApi.get = jest.fn().mockResolvedValue({
      data: { success: true, data: [{ id: "integration-1" }] },
    });

    renderHook(() => useIntegrationsData());
    const firstQuery = (useQuery as jest.Mock).mock.calls[0][0];

    await expect(firstQuery.queryFn()).resolves.toEqual([
      { id: "integration-1" },
    ]);
  });
});
