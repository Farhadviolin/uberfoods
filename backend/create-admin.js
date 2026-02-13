const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@uberfoods.com';
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error('ADMIN_PASSWORD muss gesetzt sein, um den Admin zu erstellen.');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  
  const admin = await prisma.admin.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      isActive: true,
    },
    create: {
      email,
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('✅ Admin User erstellt/aktualisiert:');
  console.log(`   Email: ${email}`);
  console.log('   Passwort: (aus ENV, nicht angezeigt)');
}

main()
  .catch((e) => {
    console.error('❌ Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
