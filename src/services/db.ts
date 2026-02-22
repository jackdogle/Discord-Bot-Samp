import mysql from 'mysql2/promise';

export enum DbErrorCode {
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  DATABASE_NOT_FOUND = 'DATABASE_NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

export interface DbErrorDetails {
  code: DbErrorCode;
  message: string;
  originalError?: any;
}

let pool: mysql.Pool | null = null;

export function handleDbError(error: any): DbErrorDetails {
  const code = error.code;
  
  switch (code) {
    case 'ECONNREFUSED':
      return {
        code: DbErrorCode.CONNECTION_REFUSED,
        message: 'Could not connect to the database server. Please check if the host and port are correct.',
        originalError: error
      };
    case 'ER_ACCESS_DENIED_ERROR':
      return {
        code: DbErrorCode.ACCESS_DENIED,
        message: 'Invalid database credentials. Please check your username and password.',
        originalError: error
      };
    case 'ER_BAD_DB_ERROR':
      return {
        code: DbErrorCode.DATABASE_NOT_FOUND,
        message: 'The specified database does not exist.',
        originalError: error
      };
    case 'PROTOCOL_CONNECTION_LOST':
    case 'ETIMEDOUT':
      return {
        code: DbErrorCode.TIMEOUT,
        message: 'Database connection timed out or was lost.',
        originalError: error
      };
    default:
      return {
        code: DbErrorCode.UNKNOWN,
        message: error.message || 'An unexpected database error occurred.',
        originalError: error
      };
  }
}

export async function getDb() {
  if (!pool) {
    const config = {
      host: process.env.DB_HOST || '167.71.197.62',
      user: process.env.DB_USER || 'u5_Tqjt8t7STW',
      password: process.env.DB_PASSWORD || 'gj7!jW9nmI4dbu35UgxcceUA',
      database: process.env.DB_NAME || 's5_project_1',
      port: parseInt(process.env.DB_PORT || '3306'),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 5000 // 5 seconds timeout
    };

    try {
      pool = mysql.createPool(config);
      console.log('MySQL pool created. Connection will be established on first query.');
    } catch (error) {
      const details = handleDbError(error);
      console.error('Failed to create MySQL pool:', details);
      throw details;
    }
  }
  return pool;
}

export async function testConnection() {
  try {
    const db = await getDb();
    const connection = await db.getConnection();
    await connection.ping();
    connection.release();
    return { success: true };
  } catch (error) {
    return { success: false, error: handleDbError(error) };
  }
}
