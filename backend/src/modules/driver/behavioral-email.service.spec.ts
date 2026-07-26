import {
  createBehavioralEmailReplacements,
  createCampaignRecommendation,
} from "./behavioral-email.service";

describe("BehavioralEmailService contracts", () => {
  it("formats every template replacement as a string", () => {
    const replacements = createBehavioralEmailReplacements({
      driverName: "Alex",
      currentTier: "BASIC",
      recommendedTier: "PRO",
      expectedEarningsIncrease: 42.6,
      averageRating: "4.8",
      onTimeRate: "95",
      churnRisk: 0.376,
      daysLeft: "3",
    });

    expect(replacements).toEqual({
      "{{driverName}}": "Alex",
      "{{currentTier}}": "BASIC",
      "{{recommendedTier}}": "PRO",
      "{{earningsIncrease}}": "43",
      "{{avgRating}}": "4.8",
      "{{onTimeRate}}": "95",
      "{{churnRisk}}": "38",
      "{{daysLeft}}": "3",
    });
    expect(
      Object.values(replacements).every((value) => typeof value === "string"),
    ).toBe(true);
  });

  it("serializes campaign timestamps for the Prisma JSON contract", () => {
    const sentAt = new Date("2026-07-26T18:30:00.000Z");

    expect(createCampaignRecommendation("retention", "sent", sentAt)).toEqual({
      type: "email_campaign",
      campaignId: "retention",
      status: "sent",
      sentAt: "2026-07-26T18:30:00.000Z",
    });
  });

  it("does not persist an invalid campaign timestamp as successful JSON", () => {
    expect(() =>
      createCampaignRecommendation("retention", "sent", new Date("invalid")),
    ).toThrow(RangeError);
  });
});
