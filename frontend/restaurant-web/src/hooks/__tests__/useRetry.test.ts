import { renderHook } from "@testing-library/react";
import { useRetry } from "../useRetry";

describe("useRetry", () => {
  it.each([401, 403, 404])(
    "does not retry an Axios-style %s response",
    async (status) => {
      const request = jest.fn().mockRejectedValue({ response: { status } });
      const { result } = renderHook(() =>
        useRetry(request, { maxRetries: 3, retryDelay: 0 }),
      );

      await expect(result.current.execute()).rejects.toEqual({
        response: { status },
      });
      expect(request).toHaveBeenCalledTimes(1);
    },
  );
});
