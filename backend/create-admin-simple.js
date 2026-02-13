const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@uberfoods.com';
    const password = process.env.ADMIN_PASSWORD;

    if (!password) {
      throw new Error('ADMIN_PASSWORD muss gesetzt sein, um den Admin zu erstellen.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const admin = await prisma.$executeRaw`
      INSERT INTO "Admin" (id, email, password, name, role, "isActive", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${email}, ${hashedPassword}, 'Admin User', 'ADMIN', true, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        "isActive" = true,
        "updatedAt" = NOW()
    `;
    
    console.log('✅ Admin User erstellt/aktualisiert!');
    console.log(`   Email: ${email}`);
    console.log('   Passwort: (aus ENV, nicht angezeigt)');
  } catch (error) {
    console.error('❌ Fehler:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
