import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function createAdmin() {
  const prisma = new PrismaClient();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('❌ ADMIN_PASSWORD environment variable is required but not set.');
    process.exit(1);
  }

  try {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const admin = await prisma.admin.upsert({
      where: { email: 'admin@uberfoods.com' },
      update: { password: hashedPassword, isActive: true },
      create: { email: 'admin@uberfoods.com', password: hashedPassword, name: 'E2E Admin', isActive: true }
    });
    console.log('✅ Admin created:', admin.email);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
