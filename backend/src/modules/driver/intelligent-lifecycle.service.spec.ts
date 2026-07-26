import { createAutomationRecommendation } from "./intelligent-lifecycle.service";

describe("IntelligentLifecycleService JSON contract", () => {
  it("serializes automation timestamps without changing lifecycle outcome data", () => {
    const timestamp = new Date("2026-07-26T19:00:00.000Z");

    expect(
      createAutomationRecommendation("upgrade-rule", 2, timestamp),
    ).toEqual({
      type: "automation_rule",
      ruleId: "upgrade-rule",
      actionsExecuted: 2,
      timestamp: "2026-07-26T19:00:00.000Z",
    });
  });

  it("does not persist an invalid lifecycle timestamp as successful JSON", () => {
    expect(() =>
      createAutomationRecommendation("upgrade-rule", 2, new Date("invalid")),
    ).toThrow(RangeError);
  });
});
