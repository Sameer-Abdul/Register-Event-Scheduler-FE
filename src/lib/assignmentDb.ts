import { Pool, PoolClient } from 'pg';
import { query } from './db';
import pool from './db';

export interface Assignment {
  id: number;
  register_id: number;
  file_name: string;
  file_data: Buffer;
  file_size: number;
  file_type: string;
  submission_date: Date;
  created_at: Date;
}

export interface CreateAssignmentInput {
  register_id: number;
  file_name: string;
  file_data: Buffer;
  file_size: number;
  file_type: string;
}

export async function createAssignment(
  assignmentData: CreateAssignmentInput
): Promise<Assignment> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Inserting assignment into database:', {
      register_id: assignmentData.register_id,
      file_name: assignmentData.file_name,
      file_size: assignmentData.file_size,
      file_type: assignmentData.file_type,
      has_file_data: !!assignmentData.file_data
    });
    
    const result = await client.query<Assignment>(
      `INSERT INTO assignments (
        register_id,
        file_name, 
        file_data,
        file_size, 
        file_type
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        assignmentData.register_id,
        assignmentData.file_name,
        assignmentData.file_data, // This will be stored as BYTEA
        assignmentData.file_size,
        assignmentData.file_type
      ]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating assignment:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getAssignmentsByRegisterId(
  registerId: number
): Promise<Assignment[]> {
  const result = await query(
    'SELECT * FROM assignments WHERE register_id = $1 ORDER BY submission_date DESC',
    [registerId]
  );
  return result.rows as Assignment[];
}

export async function getAssignmentById(
  id: number,
  registerId: number
): Promise<Assignment | null> {
  const result = await query(
    'SELECT * FROM assignments WHERE id = $1 AND register_id = $2',
    [id, registerId]
  );
  return (result.rows[0] as Assignment) || null;
}

// Get register details by email (since we're using email as ID in the session)
export async function getRegisterDetails(email: string): Promise<{id: number, first_name: string, last_name: string} | null> {
  try {
    const result = await query(
      'SELECT id, first_name, last_name FROM register WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching register details:', error);
    return null;
  }
}
