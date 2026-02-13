import { jest } from "@jest/globals";

type MockFn = jest.Mock;

interface PrismaModelMock {
  count: MockFn;
  findMany: MockFn;
  findUnique: MockFn;
  findFirst: MockFn;
  create: MockFn;
  update: MockFn;
  delete: MockFn;
  deleteMany: MockFn;
  upsert: MockFn;
  createMany: MockFn;
}

export interface PrismaMock {
  restaurant: PrismaModelMock;
  order: PrismaModelMock;
  customer: PrismaModelMock;
  driver: PrismaModelMock;
  admin: PrismaModelMock;
  dish: PrismaModelMock;
  payment: PrismaModelMock;
  paymentMethod: PrismaModelMock;
  auditLog: PrismaModelMock;
  pushSubscription: PrismaModelMock;
  notification: PrismaModelMock;
  chatMessage: PrismaModelMock;
  review: PrismaModelMock;
  reviewReply: PrismaModelMock;
  reviewLike: PrismaModelMock;
  promotion: PrismaModelMock;
  stockItem: PrismaModelMock;
  giftCard: PrismaModelMock;
  staff: PrismaModelMock;
  customerLoyalty: PrismaModelMock;
  loyaltyPointsHistory: PrismaModelMock;
  reward: PrismaModelMock;
  shift: PrismaModelMock;
  groupOrder: PrismaModelMock;
  setting: PrismaModelMock;
  socialPost: PrismaModelMock;
  socialLike: PrismaModelMock;
  socialComment: PrismaModelMock;
  socialFollow: PrismaModelMock;
  socialHiddenPost: PrismaModelMock;
  socialChallenge: PrismaModelMock;
  socialChallengeParticipant: PrismaModelMock;
  supportTicket: PrismaModelMock;
  mealPlan: PrismaModelMock;
  report: PrismaModelMock;
  dashboard: PrismaModelMock;
  scheduledReport: PrismaModelMock;
  $transaction: MockFn;
  [key: string]: PrismaModelMock | any;
}

const createModelMock = (): PrismaModelMock => ({
  count: jest.fn(),
  findMany: jest.fn(),
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  upsert: jest.fn(),
  createMany: jest.fn(),
});

/**
 * Leichtgewichtige Prisma-Mock-Factory für Unit-Tests.
 * Erweitern Sie bei Bedarf weitere Models und Methoden.
 */
export const createPrismaMock = (): PrismaMock => ({
  restaurant: createModelMock(),
  order: createModelMock(),
  customer: createModelMock(),
  driver: createModelMock(),
  admin: createModelMock(),
  dish: createModelMock(),
  payment: createModelMock(),
  paymentMethod: createModelMock(),
  auditLog: createModelMock(),
  pushSubscription: createModelMock(),
  notification: createModelMock(),
  chatMessage: createModelMock(),
  review: createModelMock(),
  reviewReply: createModelMock(),
  reviewLike: createModelMock(),
  promotion: createModelMock(),
  stockItem: createModelMock(),
  giftCard: createModelMock(),
  staff: createModelMock(),
  customerLoyalty: createModelMock(),
  loyaltyPointsHistory: createModelMock(),
  reward: createModelMock(),
  shift: createModelMock(),
  groupOrder: createModelMock(),
  setting: createModelMock(),
  socialPost: createModelMock(),
  socialLike: createModelMock(),
  socialComment: createModelMock(),
  socialFollow: createModelMock(),
  socialHiddenPost: createModelMock(),
  socialChallenge: createModelMock(),
  socialChallengeParticipant: createModelMock(),
  supportTicket: createModelMock(),
  mealPlan: createModelMock(),
  report: createModelMock(),
  dashboard: createModelMock(),
  scheduledReport: createModelMock(),
  $transaction: jest.fn((operations: any[]) => Promise.all(operations)),
});
