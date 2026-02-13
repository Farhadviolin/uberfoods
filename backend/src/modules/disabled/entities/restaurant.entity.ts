// TypeORM entity compatibility layer for Prisma
// This file provides compatibility for code that expects TypeORM entities

export type RestaurantEntity = {
  id: string;
  name: string;
  description?: string;
  address: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Add other fields as needed
};

export class Restaurant {} // Empty class for compatibility
