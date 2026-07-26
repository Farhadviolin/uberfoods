import { calculateEarningsVolatility } from "./churn-prediction.service";

describe("ChurnPredictionService earnings contract", () => {
  it("calculates daily volatility from driver commissions without changing values", () => {
    expect(
      calculateEarningsVolatility([
        {
          driverCommission: 10,
          createdAt: new Date("2026-07-25T08:00:00.000Z"),
        },
        {
          driverCommission: 10,
          createdAt: new Date("2026-07-25T16:00:00.000Z"),
        },
        {
          driverCommission: 30,
          createdAt: new Date("2026-07-26T08:00:00.000Z"),
        },
      ]),
    ).toBe(5);
  });

  it("returns zero volatility only when no commission transaction exists", () => {
    expect(calculateEarningsVolatility([])).toBe(0);
  });
});
