import { QueryOptimizer } from "./query-optimizer.util";

describe("QueryOptimizer", () => {
  describe("normalizePagination", () => {
    it("setzt Defaults und begrenzt Limits korrekt", () => {
      const result = QueryOptimizer.normalizePagination({ page: -2, limit: 500, maxLimit: 100 });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(100);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(100);
    });
  });

  describe("createPaginatedResponse", () => {
    it("berechnet hasNext/hasPrev korrekt", () => {
      const res = QueryOptimizer.createPaginatedResponse([1, 2], 5, 2, 2);
      expect(res.pagination.totalPages).toBe(3);
      expect(res.pagination.hasNext).toBe(true);
      expect(res.pagination.hasPrev).toBe(true);
    });
  });

  describe("applySafeLimit", () => {
    it("kappt oberhalb maxLimit und setzt Default", () => {
      expect(QueryOptimizer.applySafeLimit(200, 50, 10)).toBe(50);
      expect(QueryOptimizer.applySafeLimit(undefined, 50, 10)).toBe(10);
    });
  });

  describe("optimizeDateRange", () => {
    it("begrenzt die Range auf maxDays und Zukunft", () => {
      const now = new Date();
      const future = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
      const startPast = new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000);
      const { start, end } = QueryOptimizer.optimizeDateRange(startPast, future, 30);
      const diffDays = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      expect(diffDays).toBeLessThanOrEqual(30);
      // Erlaube kleine Timing-Unterschiede (bis zu 100ms Toleranz)
      expect(end.getTime()).toBeLessThanOrEqual(now.getTime() + 100);
    });
  });

  describe("createCursorPagination", () => {
    it("liefert nextCursor und hasMore korrekt", () => {
      const data = [
        { id: "a", value: 1 },
        { id: "b", value: 2 },
        { id: "c", value: 3 },
      ];
      const res = QueryOptimizer.createCursorPagination(data, "id", 2);
      expect(res.data).toHaveLength(2);
      expect(res.hasMore).toBe(true);
      expect(res.nextCursor).toBe("b");
    });
  });

  describe("batchProcess", () => {
    it("verarbeitet Items in Batches", async () => {
      const items = [1, 2, 3, 4, 5];
      const processed = await QueryOptimizer.batchProcess(
        items,
        async (batch) => batch.map((n) => n * 2),
        2,
      );
      expect(processed).toEqual([2, 4, 6, 8, 10]);
    });
  });

  describe("withQueryTimeout", () => {
    it("resolves vor Timeout", async () => {
      const fast = Promise.resolve("ok");
      await expect(QueryOptimizer.withQueryTimeout(fast, 50)).resolves.toBe("ok");
    });

    it("rejects bei Timeout", async () => {
      const slow = new Promise((resolve) => setTimeout(() => resolve("late"), 50));
      await expect(
        QueryOptimizer.withQueryTimeout(slow as Promise<string>, 10, "timeout"),
      ).rejects.toThrow("timeout");
    });
  });
});
