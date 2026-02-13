import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Erstelle Prisma Client mit Adapter (wie in PrismaService)
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

async function seedRBAC() {
  console.log('🌱 Seeding RBAC data...');

  // Create default permissions
  const permissions = [
    // Admin permissions
    { resource: 'admin', action: 'read', description: 'View admin users' },
    { resource: 'admin', action: 'create', description: 'Create admin users' },
    { resource: 'admin', action: 'update', description: 'Update admin users' },
    { resource: 'admin', action: 'delete', description: 'Delete admin users' },
    
    // Order permissions
    { resource: 'order', action: 'read', description: 'View orders' },
    { resource: 'order', action: 'create', description: 'Create orders' },
    { resource: 'order', action: 'update', description: 'Update orders' },
    { resource: 'order', action: 'delete', description: 'Delete orders' },
    
    // Driver permissions
    { resource: 'driver', action: 'read', description: 'View drivers' },
    { resource: 'driver', action: 'create', description: 'Create drivers' },
    { resource: 'driver', action: 'update', description: 'Update drivers' },
    { resource: 'driver', action: 'delete', description: 'Delete drivers' },
    
    // Restaurant permissions
    { resource: 'restaurant', action: 'read', description: 'View restaurants' },
    { resource: 'restaurant', action: 'create', description: 'Create restaurants' },
    { resource: 'restaurant', action: 'update', description: 'Update restaurants' },
    { resource: 'restaurant', action: 'delete', description: 'Delete restaurants' },
    
    // Customer permissions
    { resource: 'customer', action: 'read', description: 'View customers' },
    { resource: 'customer', action: 'create', description: 'Create customers' },
    { resource: 'customer', action: 'update', description: 'Update customers' },
    { resource: 'customer', action: 'delete', description: 'Delete customers' },
    
    // Financial permissions
    { resource: 'financial', action: 'read', description: 'View financial data' },
    { resource: 'financial', action: 'update', description: 'Update financial data' },
    
    // System permissions
    { resource: 'system', action: 'read', description: 'View system information' },
    { resource: 'system', action: 'update', description: 'Update system settings' },
    
    // Analytics permissions
    { resource: 'analytics', action: 'read', description: 'View analytics' },
    
    // RBAC permissions
    { resource: 'rbac', action: 'read', description: 'View RBAC data' },
    { resource: 'rbac', action: 'create', description: 'Create RBAC entities' },
    { resource: 'rbac', action: 'update', description: 'Update RBAC entities' },
    { resource: 'rbac', action: 'delete', description: 'Delete RBAC entities' },
    
    // Support permissions
    { resource: 'support', action: 'read', description: 'View support tickets' },
    { resource: 'support', action: 'create', description: 'Create support tickets' },
    { resource: 'support', action: 'update', description: 'Update support tickets' },
  ];

  for (const perm of permissions) {
    try {
      await prisma.permission.upsert({
        where: {
          resource_action: {
            resource: perm.resource,
            action: perm.action,
          },
        },
        update: {},
        create: perm,
      });
    } catch (error: any) {
      // If unique constraint name is different, try alternative approach
      if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
        // Permission already exists, skip
        continue;
      }
      // Try creating directly
      try {
        await prisma.permission.create({ data: perm });
      } catch (createError: any) {
        if (createError.code !== 'P2002') {
          console.warn(`Failed to create permission ${perm.resource}:${perm.action}:`, createError.message);
        }
      }
    }
  }

  console.log(`✅ Created ${permissions.length} permissions`);

  // Create default roles with permissions
  const superAdminPermissions = permissions.map(p => `${p.resource}:*`);
  const adminPermissions = [
    'order:*',
    'driver:*',
    'restaurant:*',
    'customer:*',
    'analytics:*',
    'financial:read',
    'system:read',
    'rbac:read',
  ];
  const moderatorPermissions = [
    'order:read',
    'order:update',
    'driver:read',
    'restaurant:read',
    'customer:read',
    'analytics:read',
  ];
  const supportPermissions = [
    'order:read',
    'customer:read',
    'customer:update',
    'support:*',
  ];

  const roles = [
    {
      name: 'SUPER_ADMIN',
      description: 'Super Administrator with full system access',
      permissions: superAdminPermissions,
    },
    {
      name: 'ADMIN',
      description: 'Administrator with most system access',
      permissions: adminPermissions,
    },
    {
      name: 'MODERATOR',
      description: 'Moderator with read and limited update access',
      permissions: moderatorPermissions,
    },
    {
      name: 'SUPPORT',
      description: 'Support staff with customer and order access',
      permissions: supportPermissions,
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {
        description: role.description,
        permissions: role.permissions,
      },
      create: role,
    });
  }

  console.log(`✅ Created ${roles.length} roles`);

  console.log('✅ RBAC seeding completed!');
}

async function seedReporting() {
  console.log('📊 Seeding Reporting data...');

  try {
    // Get first admin user for seeding
    const adminUser = await prisma.admin.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });

    if (!adminUser) {
      console.log('⚠️ No admin user found, skipping reporting seed');
      return;
    }

    console.log('✅ Found admin user for seeding');
    console.log('✅ Reporting seeding completed (basic setup)!');

  } catch (error) {
    console.error('❌ Error seeding reporting data:', error);
    // Don't fail the entire seeding process for reporting errors
  }
}

async function main() {
  await seedRBAC();
  await seedReporting();
}

main()
  .catch((e) => {
    console.error('❌ Error seeding RBAC:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

