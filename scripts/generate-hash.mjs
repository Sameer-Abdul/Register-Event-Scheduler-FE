import { pbkdf2Sync, randomBytes } from 'crypto';

// Create a simple hash function using Node's crypto
function createHash(password, salt) {
  return pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// Generate a random salt
const salt = randomBytes(16).toString('hex');
const password = 'admin123';

// Create the hash
const hash = createHash(password, salt);

// Output the results
console.log('Password:', password);
console.log('Salt:', salt);
console.log('Hash:', hash);

// Generate SQL to update the password
console.log('\nSQL to update password:');
console.log(`UPDATE register SET password_hash = '${salt}:${hash}' WHERE email = 'admin@a.com';`);

// Verify the hash
function verifyHash(password, salt, hash) {
  const newHash = createHash(password, salt);
  return newHash === hash;
}

console.log('\nVerification:', verifyHash('admin123', salt, hash) ? 'Success' : 'Failed');
