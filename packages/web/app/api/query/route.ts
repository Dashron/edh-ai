import { NextRequest, NextResponse } from 'next/server';
import { Database } from 'sqlite3';
import path from 'path';

// Database connection using the existing cards.db from parent project
const DB_PATH = path.join(process.cwd(), '..', '..', 'data', 'cards.db');

interface DatabaseRow {
  [key: string]: unknown;
}

// Helper function to run SQL queries with Promise wrapper
function runQuery(db: Database, query: string): Promise<DatabaseRow[]> {
  return new Promise((resolve, reject) => {
    db.all(query, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows as DatabaseRow[]);
      }
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    console.log('Received query:', query);
    console.log('DB_PATH:', DB_PATH);
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Basic SQL injection protection - only allow SELECT statements
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery.startsWith('select')) {
      return NextResponse.json({ 
        error: 'Only SELECT queries are allowed' 
      }, { status: 400 });
    }

    console.log('Creating database connection...');
    const db = new Database(DB_PATH);
    
    try {
      console.log('Executing query...');
      const results = await runQuery(db, query);
      console.log('Query results:', results.length, 'rows');
      
      return NextResponse.json({
        success: true,
        data: results,
        rowCount: results.length
      });
    } finally {
      console.log('Closing database connection...');
      db.close();
    }
    
  } catch (error) {
    console.error('Database query error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Database query failed' 
    }, { status: 500 });
  }
}