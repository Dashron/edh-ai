#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { CardDatabase } from './database.js';
import type { EdHCard } from './types.js';
import parser from 'stream-json';
import StreamArray from 'stream-json/streamers/StreamArray.js';

// Process large JSON files using streaming
async function streamJsonImport(jsonPath: string, db: CardDatabase): Promise<{ imported: number; skipped: number }> {
    return new Promise((resolve, reject) => {
        let imported = 0;
        let skipped = 0;
        let firstCardImported = false;
        
        console.log('📦 Setting up streaming parser...');
        
        const pipeline = fs.createReadStream(jsonPath)
            .pipe(parser())
            .pipe(new StreamArray());
        
        let isFirstCard = true;
        
        pipeline.on('data', async (data: { value: EdHCard }) => {
            try {
                if (isFirstCard) {
                    console.log('🚀 Started processing cards from stream...');
                    isFirstCard = false;
                }
                
                // Pause the stream while we process
                pipeline.pause();
                
                // StreamArray gives us individual card objects in data.value and index in data.key
                const card = data.value as EdHCard;
                const cardIndex = (data as any).key as number;
                
                // Early filtering - skip cards we don't need for EDH
                if (!card.name || !card.type_line) {
                    skipped++;
                    pipeline.resume();
                    return;
                }
                
                // Skip tokens, art cards, and other non-playable cards
                const typeLine = card.type_line.toLowerCase();
                if (typeLine.includes('token') || typeLine.includes('art card') || typeLine.includes('emblem')) {
                    skipped++;
                    pipeline.resume();
                    return;
                }
                
                await db.insertCard(card);
                imported++;
                
                if (!firstCardImported) {
                    console.log(`🎯 First card successfully imported: "${card.name}"`);
                    firstCardImported = true;
                }
                
                // Progress indicator and periodic cleanup
                if (imported % 1000 === 0) {
                    console.log(`📦 Imported ${imported} cards...`);
                    // Force garbage collection every 5000 cards if available
                    if (imported % 5000 === 0 && global.gc) {
                        const memBefore = process.memoryUsage();
                        const heapBeforeMB = (memBefore.heapUsed / 1024 / 1024).toFixed(1);
                        console.log(`🧹 Running garbage collection (heap before: ${heapBeforeMB} MB)...`);
                        global.gc();
                        const memAfter = process.memoryUsage();
                        const heapAfterMB = (memAfter.heapUsed / 1024 / 1024).toFixed(1);
                        const freedMB = ((memBefore.heapUsed - memAfter.heapUsed) / 1024 / 1024).toFixed(1);
                        console.log(`✨ GC complete (heap after: ${heapAfterMB} MB, freed: ${freedMB} MB)`);
                    }
                }
                
                // Resume processing
                pipeline.resume();
                
            } catch (error) {
                console.warn(`⚠️ Failed to import card "${data.value?.name}":`, error);
                skipped++;
                pipeline.resume();
            }
        });
        
        pipeline.on('end', () => {
            console.log('📦 Streaming completed');
            resolve({ imported, skipped });
        });
        
        pipeline.on('error', (error) => {
            console.error('❌ Streaming error:', error);
            reject(error);
        });
    });
}

async function importCardsFromJson(jsonPath: string): Promise<void> {
    console.log(`📖 Starting import from: ${jsonPath}`);
    
    const db = new CardDatabase();
    
    try {
        await db.connect();
        await db.initializeSchema();
        
        // Try simple approach first for smaller files
        const stats = fs.statSync(jsonPath);
        const fileSizeMB = stats.size / (1024 * 1024);
        
        console.log(`📊 File size: ${fileSizeMB.toFixed(1)} MB`);
        
        if (fileSizeMB > 100) {
            // Use streaming for large files
            console.log('📊 Using streaming import for large file...');
            const result = await streamJsonImport(jsonPath, db);
            
            console.log(`✅ Import complete!`);
            console.log(`   Imported: ${result.imported} cards`);
            console.log(`   Skipped: ${result.skipped} cards`);
        } else {
            // Use simple approach for smaller files
            console.log('📊 Reading JSON file...');
            const fileContent = fs.readFileSync(jsonPath, 'utf8');
            const cards: EdHCard[] = JSON.parse(fileContent);
            
            console.log(`📦 Found ${cards.length} cards to import`);
            
            let imported = 0;
            let skipped = 0;
            
            for (const card of cards) {
                try {
                    // Only import cards with required fields
                    if (!card.name || !card.type_line) {
                        skipped++;
                        continue;
                    }
                    
                    await db.insertCard(card);
                    imported++;
                    
                    // Progress indicator
                    if (imported % 1000 === 0) {
                        console.log(`📦 Imported ${imported} cards...`);
                    }
                    
                } catch (error) {
                    console.warn(`⚠️ Failed to import card "${card.name}":`, error);
                    skipped++;
                }
            }
            
            console.log(`✅ Import complete!`);
            console.log(`   Imported: ${imported} cards`);
            console.log(`   Skipped: ${skipped} cards`);
        }
        
    } catch (error) {
        console.error('❌ Import failed:', error);
        throw error;
    } finally {
        await db.close();
    }
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Usage: npm run import-cards [--all] [path-to-scryfall-json]

Imports Scryfall card data from JSON file into SQLite database.

Options:
  --all                      Import all cards instead of oracle cards
  --help, -h                 Show this help message

Arguments:
  <path-to-scryfall-json>    Path to Scryfall JSON file (optional if using default files)

Examples:
  npm run import-cards                              # Import oracle cards from data/oracle-cards.json (default)
  npm run import-cards --all                       # Import all cards from data/all-cards.json
  npm run import-cards ./custom/oracle.json        # Import from custom path
  npm run import-cards --all ./custom/all-cards.json  # Import all cards from custom path
`);
        process.exit(0);
    }
    
    const isAll = args.includes('--all');
    const pathArgs = args.filter(arg => !arg.startsWith('--'));
    
    let jsonPath: string;
    if (pathArgs.length > 0) {
        jsonPath = pathArgs[0];
    } else {
        // Use default paths - oracle cards by default
        jsonPath = isAll ? '../../data/all-cards.json' : '../../data/oracle-cards.json';
    }
    
    const resolvedPath = path.resolve(jsonPath);
    
    if (!fs.existsSync(resolvedPath)) {
        console.error(`❌ Error: File not found: ${resolvedPath}`);
        process.exit(1);
    }
    
    console.log(`📁 Importing ${isAll ? 'all' : 'oracle'} cards from: ${resolvedPath}`);
    
    try {
        await importCardsFromJson(resolvedPath);
        console.log('🎉 Import successful!');
    } catch (error) {
        console.error('❌ Import failed:', error);
        process.exit(1);
    }
}

// Run the import if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
}