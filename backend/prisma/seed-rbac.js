// Lade .env Datei
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

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
    { resource: 'analytics', action: 'export', description: 'Export analytics' },
    
    // RBAC permissions
    { resource: 'rbac', action: 'read', description: 'View RBAC data' },
    { resource: 'rbac', action: 'create', description: 'Create RBAC entities' },
    { resource: 'rbac', action: 'update', description: 'Update RBAC entities' },
    { resource: 'rbac', action: 'delete', description: 'Delete RBAC entities' },
    
    // Support permissions
    { resource: 'support', action: 'read', description: 'View support tickets' },
    { resource: 'support', action: 'create', description: 'Create support tickets' },
    { resource: 'support', action: 'update', description: 'Update support tickets' },
    { resource: 'support', action: 'delete', description: 'Delete support tickets' },
    
    // Marketing permissions
    { resource: 'marketing', action: 'read', description: 'View marketing campaigns' },
    { resource: 'marketing', action: 'create', description: 'Create marketing campaigns' },
    { resource: 'marketing', action: 'update', description: 'Update marketing campaigns' },
    { resource: 'marketing', action: 'delete', description: 'Delete marketing campaigns' },
    
    // Inventory permissions
    { resource: 'inventory', action: 'read', description: 'View inventory' },
    { resource: 'inventory', action: 'create', description: 'Create inventory items' },
    { resource: 'inventory', action: 'update', description: 'Update inventory items' },
    { resource: 'inventory', action: 'delete', description: 'Delete inventory items' },
    
    // AI/ML permissions
    { resource: 'ai-ml', action: 'read', description: 'View AI/ML models' },
    { resource: 'ai-ml', action: 'create', description: 'Create AI/ML models' },
    { resource: 'ai-ml', action: 'update', description: 'Update AI/ML models' },
    { resource: 'ai-ml', action: 'delete', description: 'Delete AI/ML models' },
    
    // Automation permissions
    { resource: 'automation', action: 'read', description: 'View automation rules' },
    { resource: 'automation', action: 'create', description: 'Create automation rules' },
    { resource: 'automation', action: 'update', description: 'Update automation rules' },
    { resource: 'automation', action: 'delete', description: 'Delete automation rules' },
    
    // Monitoring permissions
    { resource: 'monitoring', action: 'read', description: 'View monitoring dashboards' },
    { resource: 'monitoring', action: 'create', description: 'Create monitoring alerts' },
    { resource: 'monitoring', action: 'update', description: 'Update monitoring configurations' },
    { resource: 'monitoring', action: 'delete', description: 'Delete monitoring alerts' },
    
    // Integrations permissions
    { resource: 'integrations', action: 'read', description: 'View integrations' },
    { resource: 'integrations', action: 'create', description: 'Create integrations' },
    { resource: 'integrations', action: 'update', description: 'Update integrations' },
    { resource: 'integrations', action: 'delete', description: 'Delete integrations' },
    
    // Reporting permissions
    { resource: 'reporting', action: 'read', description: 'View reports' },
    { resource: 'reporting', action: 'create', description: 'Create reports' },
    { resource: 'reporting', action: 'update', description: 'Update reports' },
    { resource: 'reporting', action: 'delete', description: 'Delete reports' },
    
    // Multi-Tenancy permissions
    { resource: 'multitenancy', action: 'read', description: 'View tenant configurations' },
    { resource: 'multitenancy', action: 'create', description: 'Create tenants' },
    { resource: 'multitenancy', action: 'update', description: 'Update tenant configurations' },
    { resource: 'multitenancy', action: 'delete', description: 'Delete tenants' },
    
    // Tax Settings permissions
    { resource: 'tax-settings', action: 'read', description: 'View tax settings' },
    { resource: 'tax-settings', action: 'create', description: 'Create tax settings' },
    { resource: 'tax-settings', action: 'update', description: 'Update tax settings' },
    { resource: 'tax-settings', action: 'delete', description: 'Delete tax settings' },
    
    // Austrian Tax Module permissions
    { resource: 'at-tax', action: 'read', description: 'View Austrian tax data' },
    { resource: 'at-tax', action: 'create', description: 'Create Austrian tax entries' },
    { resource: 'at-tax', action: 'update', description: 'Update Austrian tax entries' },
    { resource: 'at-tax', action: 'delete', description: 'Delete Austrian tax entries' },
    
    // Cash Register Security permissions
    { resource: 'at-cash', action: 'read', description: 'View cash register security logs' },
    { resource: 'at-cash', action: 'create', description: 'Create cash register security configurations' },
    { resource: 'at-cash', action: 'update', description: 'Update cash register security configurations' },
    { resource: 'at-cash', action: 'delete', description: 'Delete cash register security configurations' },
    
    // Austrian Payroll permissions
    { resource: 'at-payroll', action: 'read', description: 'View Austrian payroll data' },
    { resource: 'at-payroll', action: 'create', description: 'Create Austrian payroll entries' },
    { resource: 'at-payroll', action: 'update', description: 'Update Austrian payroll entries' },
    { resource: 'at-payroll', action: 'delete', description: 'Delete Austrian payroll entries' },
    
    // GoBD Archiving permissions
    { resource: 'at-gobd', action: 'read', description: 'View GoBD archiving data' },
    { resource: 'at-gobd', action: 'create', description: 'Create GoBD archiving entries' },
    { resource: 'at-gobd', action: 'update', description: 'Update GoBD archiving entries' },
    { resource: 'at-gobd', action: 'delete', description: 'Delete GoBD archiving entries' },
    
    // Restaurant Accounting permissions
    { resource: 'at-restaurant', action: 'read', description: 'View restaurant accounting data' },
    { resource: 'at-restaurant', action: 'create', description: 'Create restaurant accounting entries' },
    { resource: 'at-restaurant', action: 'update', description: 'Update restaurant accounting entries' },
    { resource: 'at-restaurant', action: 'delete', description: 'Delete restaurant accounting entries' },
    
    // Legal Pages permissions
    { resource: 'legal-pages', action: 'read', description: 'View legal pages' },
    { resource: 'legal-pages', action: 'create', description: 'Create legal pages' },
    { resource: 'legal-pages', action: 'update', description: 'Update legal pages' },
    { resource: 'legal-pages', action: 'delete', description: 'Delete legal pages' },
    
    // Security permissions
    { resource: 'security', action: 'read', description: 'View security logs' },
    { resource: 'security', action: 'update', description: 'Update security settings' },
    
    // Audit permissions
    { resource: 'audit', action: 'read', description: 'View audit logs' },
    
    // Subscription permissions
    { resource: 'subscription', action: 'read', description: 'View subscriptions' },
    { resource: 'subscription', action: 'create', description: 'Create subscriptions' },
    { resource: 'subscription', action: 'update', description: 'Update subscriptions' },
    { resource: 'subscription', action: 'delete', description: 'Delete subscriptions' },
    
    // Subscription Tier Config permissions
    { resource: 'subscription-tier-config', action: 'read', description: 'View subscription tier configurations' },
    { resource: 'subscription-tier-config', action: 'create', description: 'Create subscription tier configurations' },
    { resource: 'subscription-tier-config', action: 'update', description: 'Update subscription tier configurations' },
    { resource: 'subscription-tier-config', action: 'delete', description: 'Delete subscription tier configurations' },
    
    // Settings permissions
    { resource: 'settings', action: 'read', description: 'View system settings' },
    { resource: 'settings', action: 'update', description: 'Update system settings' },
    
    // Wildcard for Super Admin
    { resource: '*', action: '*', description: 'All permissions' },
  ];

  let createdCount = 0;
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
      createdCount++;
    } catch (error) {
      if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
        // Permission already exists, skip
        continue;
      }
      console.warn(`⚠️  Failed to create permission ${perm.resource}:${perm.action}:`, error.message);
    }
  }

  console.log(`✅ Created/Updated ${createdCount} permissions`);

  // Create default roles with permissions
  const superAdminPermissions = ['*:*'];
  const adminPermissions = [
    'admin:read', 'admin:update', 'admin:create', 'admin:delete',
    'driver:read', 'driver:update', 'driver:create', 'driver:delete',
    'order:read', 'order:update', 'order:create', 'order:delete',
    'financial:read', 'financial:update',
    'system:read', 'system:update',
    'emergency:read', 'emergency:update', 'emergency:create',
    'performance:read', 'performance:update',
    'fleet:read', 'fleet:update', 'fleet:create', 'fleet:delete',
    'analytics:read', 'analytics:export',
    'settings:read', 'settings:update',
    'rbac:read', 'rbac:update', 'rbac:create', 'rbac:delete',
    'customer:read', 'customer:update', 'customer:create', 'customer:delete',
    'restaurant:read', 'restaurant:update', 'restaurant:create', 'restaurant:delete',
    'dish:read', 'dish:update', 'dish:create', 'dish:delete',
    'marketing:read', 'marketing:update', 'marketing:create', 'marketing:delete',
    'support:read', 'support:update', 'support:create', 'support:delete',
    'audit:read',
    'subscription:read', 'subscription:update', 'subscription:create', 'subscription:delete',
    'subscription-tier-config:read', 'subscription-tier-config:update', 'subscription-tier-config:create', 'subscription-tier-config:delete',
    'inventory:read', 'inventory:update', 'inventory:create', 'inventory:delete',
    'ai-ml:read', 'ai-ml:update', 'ai-ml:create', 'ai-ml:delete',
    'automation:read', 'automation:update', 'automation:create', 'automation:delete',
    'monitoring:read', 'monitoring:update', 'monitoring:create', 'monitoring:delete',
    'integrations:read', 'integrations:update', 'integrations:create', 'integrations:delete',
    'reporting:read', 'reporting:update', 'reporting:create', 'reporting:delete',
    'multitenancy:read', 'multitenancy:update', 'multitenancy:create', 'multitenancy:delete',
    'tax-settings:read', 'tax-settings:update', 'tax-settings:create', 'tax-settings:delete',
    'at-tax:read', 'at-tax:update', 'at-tax:create', 'at-tax:delete',
    'at-cash:read', 'at-cash:update', 'at-cash:create', 'at-cash:delete',
    'at-payroll:read', 'at-payroll:update', 'at-payroll:create', 'at-payroll:delete',
    'at-gobd:read', 'at-gobd:update', 'at-gobd:create', 'at-gobd:delete',
    'at-restaurant:read', 'at-restaurant:update', 'at-restaurant:create', 'at-restaurant:delete',
    'legal-pages:read', 'legal-pages:update', 'legal-pages:create', 'legal-pages:delete',
  ];
  const moderatorPermissions = [
    'order:read', 'order:update',
    'driver:read', 'driver:update',
    'customer:read', 'customer:update',
    'restaurant:read', 'restaurant:update',
    'dish:read', 'dish:update',
    'reviews:read', 'reviews:update',
    'support:read', 'support:update',
    'emergency:read', 'emergency:update',
  ];
  const supportPermissions = [
    'order:read',
    'customer:read',
    'driver:read',
    'support:read', 'support:update',
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
    try {
      // Check if role exists
      const existingRole = await prisma.role.findUnique({
        where: { name: role.name },
      });

      if (existingRole) {
        // Update existing role
        await prisma.role.update({
          where: { name: role.name },
          data: {
            description: role.description,
            permissions: role.permissions,
          },
        });
        console.log(`✅ Updated role: ${role.name}`);
      } else {
        // Create new role
        await prisma.role.create({
          data: {
            name: role.name,
            description: role.description,
            permissions: role.permissions,
          },
        });
        console.log(`✅ Created role: ${role.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to create/update role ${role.name}:`, error.message);
      console.error('Error details:', error);
    }
  }

  console.log('✅ RBAC seeding completed!');
}

seedRBAC()
  .catch((e) => {
    console.error('❌ Error seeding RBAC:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    if (pool) {
      await pool.end();
    }
  });

