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
    console.log('Validating user:', credentials.email);
    
    // Get user from register table
    const userQuery = await pool.query(
      `SELECT id, email, password_hash as password, first_name as name 
       FROM register 
       WHERE email = $1`,
      [credentials.email.toLowerCase().trim()]
    );

    if (userQuery.rows.length === 0) {
      console.log('No user found with email:', credentials.email);
      return null;
    }

    const user = userQuery.rows[0];
    console.log('Found user:', { id: user.id, email: user.email });
    
    // Verify password
    if (!user.password) {
      console.error('No password hash found for user');
      return null;
    }

    // First try direct comparison (for development)
    if (credentials.password === user.password) {
      console.log('Password matched via direct comparison');
    } 
    // Then try bcrypt comparison
    else if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      const isValid = await bcrypt.compare(credentials.password, user.password);
      if (!isValid) {
        console.log('Invalid password');
        return null;
      }
      console.log('Password matched via bcrypt');
    } else {
      console.log('Password format not recognized');
      return null;
    }

    return {
      id: user.id.toString(),
      email: user.email,
      name: user.name || user.email.split('@')[0],
      role: 'user', // Default role
    };
  } catch (error) {
    console.error('Error validating user:', error);
    return null;
  }
}

// Fix for Next.js 13+ with App Router
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role?: string;
    };
  }
}

// Debug function to log auth events
const debug = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development' || process.env.NEXTAUTH_DEBUG === 'true') {
    console.log('[NextAuth]', ...args);
  }
};

export const authOptions: NextAuthOptions = {
  // Debug configuration
  debug: process.env.NODE_ENV === 'development' || process.env.NEXTAUTH_DEBUG === 'true',
  logger: {
    error(code, metadata) {
      console.error('[NextAuth Error]', code, metadata);
    },
    warn(code) {
      console.warn('[NextAuth Warning]', code);
    },
    debug(code, metadata) {
      console.log('[NextAuth Debug]', code, metadata);
    }
  },
  
  // Pages configuration
  pages: {
    signIn: '/event-scheduler/login',
    error: '/event-scheduler/login',
  },
  
  // Session configuration
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  
  // Security
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: process.env.NODE_ENV === 'production',
  
  // Add this for better cookie handling
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
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
          try {
            userQuery = await pool.query(
              `SELECT id, email, password_hash as password, first_name as name 
               FROM register 
               WHERE email = $1`,
              [credentials.email.toLowerCase().trim()]
            );
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
            hasPassword: !!user.password
          });
          
          // Verify password with detailed logging
          let isValid = false;
          const passwordToCheck = credentials.password;
          const storedHash = user.password;
          
          console.log('Password check:', {
            inputLength: passwordToCheck?.length,
            storedHash: storedHash ? `${storedHash.substring(0, 10)}...` : 'none',
            isBcrypt: storedHash?.startsWith('$2')
          });
          
          try {
            // First try bcrypt comparison if hash looks like bcrypt
            if (storedHash?.startsWith('$2')) {
              console.log('Attempting bcrypt comparison');
              isValid = await bcrypt.compare(passwordToCheck, storedHash);
              console.log('Bcrypt comparison result:', isValid);
            } 
            // Fallback to direct comparison (for development only)
            if (!isValid && storedHash === passwordToCheck) {
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
          return userWithoutPassword;
        } catch (error) {
          console.error('Authorization error:', error);
          return null;
        }
      }
    }
  ],
  
  // Callbacks for JWT and session handling
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = 'user'; // Default role
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (session.user) {
        // Ensure we have a valid user ID
        if (token.sub) {
          session.user.id = token.sub;
        } else if (token.id) {
          session.user.id = token.id as string;
        }
        
        session.user.role = (token.role as string) || 'user';
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        
        // Add the token to the session for debugging
        (session as any).token = token;
      }
      
      // Log the session for debugging
      console.log('Session callback - Token:', token);
      console.log('Session callback - Session:', session);
      
      return session;
    },
    async redirect({ url, baseUrl }) {
      try {
        // If no callbackUrl was provided, default to dashboard
        if (!url || url === '/') {
          return `${baseUrl}/event-scheduler/dashboard`;
        }

        // Handle relative URLs
        if (url.startsWith('/')) {
          // Prevent redirecting back to login after successful login
          if (url === '/login' || url.startsWith('/login?')) {
            return `${baseUrl}/event-scheduler/dashboard`;
          }
          return `${baseUrl}${url}`;
        }

        // Handle absolute URLs
        const urlObj = new URL(url);
        if (urlObj.origin === baseUrl) {
          // Prevent redirecting back to login after successful login
          if (urlObj.pathname === '/login' || urlObj.pathname.startsWith('/login')) {
            return `${baseUrl}/event-scheduler/dashboard`;
          }
          return url;
        }

        // Default to dashboard if the URL is from a different origin
        return `${baseUrl}/event-scheduler/dashboard`;
      } catch (error) {
        console.error('Error in redirect callback:', error);
        return `${baseUrl}/event-scheduler/dashboard`;
      }
    },
  },
};

// Check if NEXTAUTH_SECRET is set
if (!process.env.NEXTAUTH_SECRET) {
  console.warn('NEXTAUTH_SECRET is not set. Please set it in your .env.local file.');
}

export default NextAuth(authOptions);
