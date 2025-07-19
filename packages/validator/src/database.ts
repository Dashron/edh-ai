import sqlite3 from 'sqlite3';
import * as path from 'path';
import type { EdHCard } from './types.js';

const DB_PATH = path.join(process.cwd(), 'data', 'cards.db');

export interface DatabaseCard {
    name: string;
    type_line: string;
    colors: string; // JSON string
    color_identity: string; // JSON string
    rarity: string;
    legalities: string; // JSON string
    mana_cost?: string;
    cmc?: number;
}

export class CardDatabase {
    private db: sqlite3.Database | null = null;

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async initializeSchema(): Promise<void> {
        if (!this.db) throw new Error('Database not connected');
        
        return new Promise((resolve, reject) => {
            const sql = `
                CREATE TABLE IF NOT EXISTS cards (
                    name TEXT PRIMARY KEY,
                    type_line TEXT NOT NULL,
                    colors TEXT NOT NULL,
                    color_identity TEXT NOT NULL,
                    rarity TEXT NOT NULL,
                    legalities TEXT NOT NULL,
                    mana_cost TEXT,
                    cmc REAL
                );
                
                CREATE INDEX IF NOT EXISTS idx_type_line ON cards(type_line);
                CREATE INDEX IF NOT EXISTS idx_legalities ON cards(legalities);
                CREATE INDEX IF NOT EXISTS idx_rarity ON cards(rarity);
            `;
            
            this.db!.exec(sql, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async getCard(name: string): Promise<EdHCard | null> {
        if (!this.db) throw new Error('Database not connected');
        
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM cards WHERE LOWER(name) = LOWER(?)';
            
            this.db!.get(sql, [name], (err, row: DatabaseCard) => {
                if (err) {
                    reject(err);
                } else if (!row) {
                    resolve(null);
                } else {
                    const card: EdHCard = {
                        name: row.name,
                        type_line: row.type_line,
                        colors: JSON.parse(row.colors),
                        color_identity: JSON.parse(row.color_identity),
                        rarity: row.rarity,
                        legalities: JSON.parse(row.legalities),
                        mana_cost: row.mana_cost,
                        cmc: row.cmc
                    };
                    resolve(card);
                }
            });
        });
    }

    async insertCard(card: EdHCard): Promise<void> {
        if (!this.db) throw new Error('Database not connected');
        
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR REPLACE INTO cards 
                (name, type_line, colors, color_identity, rarity, legalities, mana_cost, cmc)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const values = [
                card.name,
                card.type_line || '',
                JSON.stringify(card.colors || []),
                JSON.stringify(card.color_identity || []),
                card.rarity || '',
                JSON.stringify(card.legalities || {}),
                card.mana_cost,
                card.cmc
            ];
            
            this.db!.run(sql, values, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async insertCardsBatch(cards: EdHCard[]): Promise<void> {
        if (!this.db) throw new Error('Database not connected');
        
        return new Promise((resolve, reject) => {
            this.db!.serialize(() => {
                this.db!.run('BEGIN TRANSACTION');
                
                const stmt = this.db!.prepare(`
                    INSERT OR REPLACE INTO cards 
                    (name, type_line, colors, color_identity, rarity, legalities, mana_cost, cmc)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `);
                
                for (const card of cards) {
                    const values = [
                        card.name,
                        card.type_line || '',
                        JSON.stringify(card.colors || []),
                        JSON.stringify(card.color_identity || []),
                        card.rarity || '',
                        JSON.stringify(card.legalities || {}),
                        card.mana_cost,
                        card.cmc
                    ];
                    stmt.run(values);
                }
                
                stmt.finalize();
                
                this.db!.run('COMMIT', (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        });
    }

    async close(): Promise<void> {
        if (!this.db) return;
        
        return new Promise((resolve, reject) => {
            this.db!.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    this.db = null;
                    resolve();
                }
            });
        });
    }

    async getCardCount(): Promise<number> {
        if (!this.db) throw new Error('Database not connected');
        
        return new Promise((resolve, reject) => {
            this.db!.get('SELECT COUNT(*) as count FROM cards', (err, row: { count: number }) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row.count);
                }
            });
        });
    }
}