const fs = require('node:fs');
const path = require('node:path');
const { hashPassword, ADMIN_CONFIG_PATH } = require('../server');

const username = String(process.argv[2] || '').trim();
const password = String(process.argv[3] || '');

if (!username || !password) {
  console.log('Usage: node tools/update-admin.js <username> <password>');
  process.exit(1);
}

if (password.length < 8) {
  console.log('Password must be at least 8 characters.');
  process.exit(1);
}

const { hash, salt } = hashPassword(password);
const config = {
  username,
  passwordHash: hash,
  salt,
  updatedAt: new Date().toISOString()
};

fs.mkdirSync(path.dirname(ADMIN_CONFIG_PATH), { recursive: true });
fs.writeFileSync(ADMIN_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
console.log(`Admin credentials updated in ${ADMIN_CONFIG_PATH}`);
