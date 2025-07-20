#!/usr/bin/env node

import { CardDatabase } from './database.js';

async function queryDatabase(sql: string): Promise<void> {
    const db = new CardDatabase();
    
    try {
        await db.connect();
        
        const result = await new Promise<unknown[]>((resolve, reject) => {
            // @ts-expect-error - accessing private db property for raw queries
            db['db'].all(sql, (err: Error | null, rows: unknown[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
        
        if (Array.isArray(result) && result.length > 0) {
            console.table(result);
        } else {
            console.log('No results found.');
        }
        
    } catch (error) {
        console.error('❌ Query failed:', error);
        process.exit(1);
    } finally {
        await db.close();
    }
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: npm run query-db "<SQL_QUERY>"');
        console.log('');
        console.log('Examples:');
        console.log('  npm run query-db "SELECT COUNT(*) FROM cards"');
        console.log('  npm run query-db "SELECT name, type_line FROM cards WHERE type_line LIKE \'%Legendary%Creature%\' LIMIT 10"');
        console.log('  npm run query-db "SELECT rarity, COUNT(*) as count FROM cards GROUP BY rarity"');
        console.log('  npm run query-db "SELECT name FROM cards WHERE JSON_EXTRACT(color_identity, \'$[0]\') = \'W\' LIMIT 5"');
        process.exit(0);
    }
    
    const sql = args.join(' ');
    console.log(`🔍 Executing query: ${sql}`);
    console.log('');
    
    await queryDatabase(sql);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { queryDatabase };