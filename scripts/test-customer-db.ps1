# Simple E2E Customer Database Test using PowerShell
# Tests if customer exists in E2E database

$DATABASE_URL = "postgresql://uberfoods:uberfoods@localhost:5433/uberfoods_e2e"

Write-Host "🧪 Testing Customer in E2E Database..." -ForegroundColor Cyan

try {
    # Create a simple Node.js script to test the database
    $tempScript = @"
const { PrismaClient } = require('@prisma/client');

async function testCustomer() {
  const prisma = new PrismaClient();

  try {
    const customer = await prisma.customer.findUnique({
      where: { email: 'testcustomer@example.com' }
    });

    if (customer) {
      console.log('SUCCESS: Customer found');
      console.log('ID:', customer.id);
      console.log('Email:', customer.email);
      console.log('Active:', customer.isActive);
      console.log('Verified:', customer.emailVerified);
      process.exit(0);
    } else {
      console.log('FAIL: Customer not found');
      process.exit(1);
    }
  } catch (error) {
    console.log('ERROR:', error.message);
    process.exit(1);
  } finally {
    await prisma.`$disconnect();
  }
}

testCustomer();
"@

    # Write temp script and run it
    $tempScript | Out-File -FilePath "temp-db-test.mjs" -Encoding UTF8

    $env:DATABASE_URL = $DATABASE_URL
    & node temp-db-test.mjs

    $exitCode = $LASTEXITCODE

    # Clean up
    Remove-Item "temp-db-test.mjs" -ErrorAction SilentlyContinue

    exit $exitCode

} catch {
    Write-Host "❌ Test failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}