const bcrypt = require('bcrypt');

async function testPassword() {
  const password = 'Driver123!';
  const hash = await bcrypt.hash(password, 10);
  console.log('Password:', password);
  console.log('Hash length:', hash.length);
  console.log('Hash:', hash);

  const isValid = await bcrypt.compare(password, hash);
  console.log('Validation result:', isValid);
}

testPassword();