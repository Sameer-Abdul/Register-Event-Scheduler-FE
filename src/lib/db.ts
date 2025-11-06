import { Pool, PoolClient, QueryResult } from 'pg';

// Log environment variables for debugging
console.log('Environment variables:', {
  DB_USERNAME: process.env.DB_USERNAME ? '***' : 'not set',
  DB_HOST: process.env.DB_HOST || 'not set',
  DB_NAME: process.env.DB_NAME || 'not set',
  DB_PASSWORD: process.env.DB_PASSWORD ? '***' : 'not set',
  DB_PORT: process.env.DB_PORT || 'not set',
});

// Try to get the password from environment variables or use default
const dbPassword = process.env.DB_PASSWORD || 'postgres'; // Default password for local development

const pool = new Pool({
  user: process.env.DB_USERNAME || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'register_payment',
  password: dbPassword,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  // Add connection timeout to prevent hanging
  connectionTimeoutMillis: 5000,
  // Add SSL for production
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test the database connection on startup
(async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to the database');
    const res = await client.query('SELECT NOW()');
    console.log('Database server time:', res.rows[0].now);
    client.release();
  } catch (error) {
    console.error('❌ Failed to connect to the database:', error);
  }
})();

// Add error handling for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export async function query(text: string, params: any[] = []): Promise<QueryResult> {
  const start = Date.now();
  try {
    const client = await pool.connect();
    try {
      const res = await client.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, params, duration, rows: res.rowCount });
      return res;
    } catch (queryError) {
      console.error('Query error:', {
        text,
        params,
        error: queryError,
      });
      throw queryError;
    } finally {
      client.release();
    }
  } catch (connectionError) {
    console.error('Database connection error:', connectionError);
    throw new Error('Failed to get database connection');
  }
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default pool;
