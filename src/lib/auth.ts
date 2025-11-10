import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { NextAuthOptions } from 'next-auth';

import pool from './db';
import bcrypt from 'bcryptjs';

// Debug function to list all users
async function listAllUsers() {
  try {
    const result = await pool.query('SELECT id, email, password_hash, first_name, last_name FROM register');
    console.log('All users in register table:', result.rows.map(u => ({
      id: u.id,
      email: u.email,
      hasPassword: !!u.password_hash,
      name: u.first_name
    })));
    return result.rows;
  } catch (error) {
    console.error('Error listing users:', error);
    return [];
  }
}

// Call this to debug
listAllUsers();

async function validateUser(credentials: { email: string; password: string }) {
  try {
    console.log('\n=== Authentication Debug ===');
    console.log('1. Starting authentication for:', credentials.email);
    
    // Get user from register table with is_admin
    console.log('2. Querying database for user...');
    const userQuery = await pool.query(
      `SELECT id, email, password_hash as password, 
              first_name as name, is_admin, first_name, last_name
       FROM register 
       WHERE email = $1`,
      [credentials.email.toLowerCase().trim()]
    );

    if (userQuery.rows.length === 0) {
      console.error('3. ❌ No user found with email:', credentials.email);
      return null;
    }

    const user = userQuery.rows[0];
    console.log('3. ✅ User found in database:', { 
      id: user.id, 
      email: user.email,
      is_admin: user.is_admin,
      has_password: !!user.password
    });
    
    // Verify password
    if (!user.password) {
      console.error('4. ❌ No password hash found for user');
      return null;
    }

    // Get and log the exact hash from the database
    const storedHash = user.password;
    const passwordToCheck = credentials.password;
    
    console.log('4. Password verification:');
    console.log('   - Input password length:', passwordToCheck.length);
    console.log('   - Input password:', `'${passwordToCheck}'`);
    console.log('   - Stored hash (first 30 chars):', `'${storedHash.substring(0, 30)}...'`);
    console.log('   - Stored hash length:', storedHash.length);
    console.log('   - Hash type:', storedHash.startsWith('$2a$') ? 'bcrypt' : storedHash.startsWith('$2b$') ? 'bcrypt' : 'unknown');

    let isValid = false;
    
    // Try direct comparison (for development)
    if (passwordToCheck === storedHash) {
      console.log('   - ✅ Password matched via direct comparison');
      isValid = true;
    } 
    // Try bcrypt comparison
    else if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
      console.log('   - Trying bcrypt comparison...');
      try {
        const start = Date.now();
        
        // Try with raw password
        console.log('   - Attempt 1: Raw password comparison');
        isValid = await bcrypt.compare(passwordToCheck, storedHash);
        console.log(`   - Bcrypt comparison result: ${isValid}`);
        
        // If still not valid, try with trimmed password
        if (!isValid) {
          console.log('   - Attempt 2: Trimmed password comparison');
          isValid = await bcrypt.compare(passwordToCheck.trim(), storedHash);
          console.log(`   - Bcrypt comparison with trimmed password: ${isValid}`);
        }
        
        // If still not valid, try with trimmed hash
        if (!isValid) {
          console.log('   - Attempt 3: Trimmed hash comparison');
          const trimmedHash = storedHash.trim();
          isValid = await bcrypt.compare(passwordToCheck, trimmedHash);
          console.log(`   - Bcrypt comparison with trimmed hash: ${isValid}`);
          
          if (!isValid && trimmedHash !== storedHash) {
            console.log('   - Hash had leading/trailing whitespace that was removed');
          }
        }
        
        console.log(`   - Bcrypt comparison took ${Date.now() - start}ms`);
        
        if (!isValid) {
          console.error('   - ❌ Bcrypt comparison failed');
          return null;
        }
        console.log('   - ✅ Password matched via bcrypt');
      } catch (bcryptError) {
        console.error('   - ❌ Bcrypt comparison error:', bcryptError);
        return null;
      }
    } else {
      console.error('   - ❌ Password format not recognized');
      return null;
    }

    return {
      id: user.id.toString(),
      email: user.email,
      name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email.split('@')[0],
      role: user.is_admin ? 'admin' : 'user',
      is_admin: user.is_admin || false
    };
  } catch (error) {
    console.error('Error validating user:', error);
    return null;
  }
}

// Extend NextAuth types
declare module 'next-auth' {
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string;
    is_admin?: boolean;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role?: string;
      is_admin?: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role?: string;
    is_admin?: boolean;
  }
}

// Debug function to log auth events
const debug = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development' || process.env.NEXTAUTH_DEBUG === 'true') {
    console.log('[NextAuth]', ...args);
  }
};

// Ensure required environment variables are set
const requiredEnvVars = ['NEXTAUTH_SECRET'];
if (process.env.NODE_ENV === 'production') {
  requiredEnvVars.push('NEXTAUTH_URL');
  requiredEnvVars.push('DATABASE_URL');
}

// Check for missing environment variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  const errorMsg = `Missing required environment variables: ${missingVars.join(', ')}`;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(errorMsg);
  } else {
    console.warn(`⚠️  ${errorMsg}`);
  }
}

// Determine the base URL based on environment
const isProduction = process.env.NODE_ENV === 'production';
// Always use NEXTAUTH_URL from environment, fallback based on environment
const baseUrl = process.env.NEXTAUTH_URL || 
  (isProduction 
    ? 'https://register-event-scheduler-fe.vercel.app' 
    : 'http://localhost:3000'
  );

// For development, ensure we're using http and localhost
const devBaseUrl = 'http://localhost:3000';
const isSecure = isProduction || baseUrl.startsWith('https://');

// Log environment for debugging
console.log('Auth environment:', {
  NODE_ENV: process.env.NODE_ENV,
  baseUrl,
  isProduction,
  isSecure,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'not set',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '***' : 'not set',
  DATABASE_URL: process.env.DATABASE_URL ? '***' : 'not set'
});

export const authOptions: NextAuthOptions = {
  // Debug configuration
  debug: process.env.NODE_ENV === 'development' || process.env.NEXTAUTH_DEBUG === 'true',
  
  // Session configuration
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  
  // Security
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key',
  
  // Configure cookies
  useSecureCookies: isSecure,
  cookies: {
    sessionToken: {
      name: isSecure ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        // In development, always use non-secure cookies for localhost
        secure: isProduction,
        // In development, don't set domain to allow localhost cookies to work
        domain: isProduction ? new URL(baseUrl).hostname : undefined,
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
  },
  
  // Logger configuration
  logger: {
    error(code, metadata) {
      console.error('[NextAuth Error]', code, metadata);
    },
    warn(code) {
      console.warn('[NextAuth Warning]', code);
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development' || process.env.NEXTAUTH_DEBUG === 'true') {
        console.log('[NextAuth Debug]', code, metadata);
      }
    }
  },
  
  // Pages configuration
  pages: {
    signIn: '/event-scheduler/login',
    error: '/event-scheduler/login',
  },
  
  // Authentication providers
  providers: [
    {
      id: 'credentials',
      name: 'Credentials',
      type: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials: any) {
        try {
          console.log('Authorization attempt with credentials:', {
            email: credentials?.email,
            hasPassword: !!credentials?.password
          });

          if (!credentials?.email || !credentials?.password) {
            console.error('Missing credentials');
            throw new Error('Email and password are required');
          }

          // Get user from register table with error handling
          let userQuery;
          const email = credentials.email.toLowerCase().trim();
          const queryText = `SELECT id, email, password_hash as password, first_name as name, is_admin 
                           FROM register 
                           WHERE email = $1`;
          
          console.log('Executing query:', { queryText, params: [email] });
          
          try {
            userQuery = await pool.query(queryText, [email]);
            console.log('User query result:', JSON.stringify({
              rowCount: userQuery.rowCount,
              rows: userQuery.rows.map(r => ({
                id: r.id,
                email: r.email,
                hasPassword: !!r.password,
                is_admin: r.is_admin,
                passwordLength: r.password ? r.password.length : 0,
                passwordPrefix: r.password ? r.password.substring(0, 10) + '...' : null
              }))
            }));
          } catch (dbError) {
            console.error('Database query error:', dbError);
            throw new Error('Authentication service unavailable');
          }

          if (userQuery.rows.length === 0) {
            console.error('No user found with email:', credentials.email);
            throw new Error('Invalid email or password');
          }

          const user = userQuery.rows[0];
          console.log('Found user:', { 
            id: user.id, 
            email: user.email,
            hasPassword: !!user.password,
            is_admin: user.is_admin,
            passwordLength: user.password ? user.password.length : 0,
            passwordPrefix: user.password ? user.password.substring(0, 10) + '...' : 'none'
          });
          
          // Verify password with detailed logging
          let isValid = false;
          const passwordToCheck = credentials.password;
          const storedPassword = user.password;
          
          console.log('Password check:', {
            inputLength: passwordToCheck?.length,
            inputValue: `'${passwordToCheck}'`,
            storedHash: storedPassword ? `${storedPassword.substring(0, 10)}...` : 'none',
            storedHashLength: storedPassword?.length,
            isBcrypt: storedPassword?.startsWith('$2')
          });
          
          try {
            // Check if the stored password is in the format salt:hash
            if (storedPassword && storedPassword.includes(':')) {
              const [salt, hash] = storedPassword.split(':');
              // Verify the hash using the same method as generate-hash.mjs
              const computedHash = require('crypto')
                .pbkdf2Sync(passwordToCheck, salt, 1000, 64, 'sha512')
                .toString('hex');
              isValid = computedHash === hash;
              
              if (isValid) {
                console.log('Password verified using salt:hash method');
              } else {
                console.log('Password verification failed using salt:hash method');
              }
            } else if (storedPassword?.startsWith('$2')) {
              // For bcrypt hashes, we'll need to update them to the new format
              console.log('Found bcrypt hash, please update to the new hash format');
              console.log('To update, run the following SQL:');
              console.log(`UPDATE register SET password_hash = 'new_salt:new_hash' WHERE email = '${user.email}';`);
              console.log('Use the generate-hash.mjs script to generate the new hash.');
              return null;
            } else if (process.env.NODE_ENV !== 'production' && storedPassword === passwordToCheck) {
              // Direct comparison (for development only)
              console.log('Password matched via direct comparison');
              isValid = true;
            }
          } catch (error) {
            console.error('Password verification error:', error);
            throw new Error('Error verifying password');
          }
          
          if (!isValid) {
            console.error('Invalid password for user:', user.email);
            throw new Error('Invalid email or password');
          }

          // Return user data without password
          const { password, ...userWithoutPassword } = user;
          // Ensure is_admin is included in the returned user object
          const result = {
            ...userWithoutPassword,
            role: user.is_admin ? 'admin' : 'user',
            is_admin: !!user.is_admin
          };
          console.log('Returning user data:', JSON.stringify(result));
          return result;
        } catch (error) {
          console.error('Authorization error:', error);
          return null;
        }
      }
    }
  ],
  
  // Callbacks for JWT and session handling
  callbacks: {
    async jwt({ token, user, account }) {
      // Log the JWT callback for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('JWT Callback:', { token, user, account });
      }
      // Initial sign in
      if (account && user) {
        console.log('JWT callback - New sign in:', { 
          userId: user.id, 
          provider: account.provider 
        });
        return {
          ...token,
          id: user.id,
          role: user.role || 'user',
          email: user.email,
          name: user.name
        };
      }
      return token;
    },
    async session({ session, token }) {
      // Log the session callback for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Session Callback:', { session, token });
      }
      // Send properties to the client
      if (session.user) {
        session.user = {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
          email: token.email as string,
          name: token.name as string,
        };
      }
      
      console.log('Session callback - User session:', {
        userId: session.user?.id,
        email: session.user?.email,
        expires: session.expires
      });
      
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Use the configured base URL for redirects
      const targetBaseUrl = baseUrl || 'http://localhost:3000';
      const dashboardUrl = `${targetBaseUrl}/event-scheduler/dashboard`;

      console.log('Redirect called with:', { url, baseUrl, targetBaseUrl });

      // If no URL was provided, redirect to dashboard
      if (!url || url === '/') {
        console.log('No URL provided, redirecting to dashboard');
        return dashboardUrl;
      }

      // Handle relative URLs
      if (url.startsWith('/')) {
        // Prevent redirecting back to login after successful login
        if (url === '/login' || url.startsWith('/login')) {
          console.log('Prevented login redirect, going to dashboard');
          return dashboardUrl;
        }
        // Handle relative URLs by appending to the base URL
        const redirectUrl = `${targetBaseUrl}${url}`;
        console.log('Handling relative URL, redirecting to:', redirectUrl);
        return redirectUrl;
      }

      // Handle absolute URLs
      try {
        const urlObj = new URL(url);
        const targetHost = new URL(targetBaseUrl).hostname;

        // If this is a login URL, redirect to dashboard instead
        if (urlObj.pathname === '/login' || urlObj.pathname.startsWith('/login')) {
          console.log('Prevented login redirect, going to dashboard');
          return dashboardUrl;
        }

        // Allow same-origin redirects
        if (urlObj.hostname === targetHost || 
            (!isProduction && (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1'))) {
          console.log('Allowing same-origin redirect to:', url);
          return url;
        }

        console.log('Blocked cross-origin redirect, defaulting to dashboard');
        return dashboardUrl;

      } catch (e) {
        console.error('Error parsing URL in redirect:', e);
        return dashboardUrl;
      }
    },
  },
};

// Check if NEXTAUTH_SECRET is set
if (!process.env.NEXTAUTH_SECRET) {
  console.warn('NEXTAUTH_SECRET is not set. This may cause authentication issues in production.');
}

// For Vercel deployment
if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_URL) {
  console.warn('NEXTAUTH_URL is not set in production. This may cause authentication issues.');
}

// Add debug logging for auth initialization
console.log('Initializing NextAuth with config:', {
  NODE_ENV: process.env.NODE_ENV,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '***' : 'not set',
  DATABASE_URL: process.env.DATABASE_URL ? '***' : 'not set'
});

const handler = NextAuth({
  ...authOptions,
  // Ensure we have a valid URL for callbacks
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || 'user';
        token.is_admin = (user as any).is_admin || false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).is_admin = token.is_admin as boolean;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs in development
      if (url.startsWith('/')) {
        return `${process.env.NEXTAUTH_URL || baseUrl}${url}`;
      }
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    },
  },
});

export { handler as GET, handler as POST };
