import bcrypt from 'bcrypt';

async function generateHash() {
  const password = 'admin123';
  const saltRounds = 10;
  
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Generated hash:', hash);
    
    // Verify the hash
    const isMatch = await bcrypt.compare(password, hash);
    console.log('Verification successful:', isMatch);
    
    // Generate SQL to update the password
    console.log('\nSQL to update password:');
    console.log(`UPDATE register SET password_hash = '${hash}' WHERE email = 'admin@a.com';`);
    
  } catch (error) {
    console.error('Error generating hash:', error);
  }
}

generateHash();
