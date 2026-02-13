const bcrypt = require('../backend/node_modules/bcrypt');

const password = 'TestPassword123!';
const hash = '$2b$10$BFi13XZVuKs.1ZrsOpt0vOMj1bYJ37fsO.ot/eLNokjG.WngGJn9G';

bcrypt.compare(password, hash, (err, result) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('bcrypt.compare result:', result);
  }
});