#!/usr/bin/env node

import * as fs from 'fs';
import { CardDatabase } from './database.js';
import type { EdHCard } from './types.js';

// Parse deck and extract unique card names
function parseDeckCardNames(deckContent: string): string[] {
    const lines = deckContent.split('\n');
    const cardNames = new Set<string>();

    for (const line of lines) {
        if (line.trim() === '' || line.trim().startsWith('//') || line.trim().startsWith('#')) {
            continue;
        }
        
        const parts = line.trim().split(' ');
        if (parts.length > 1) {
            const count = parseInt(parts[0], 10);
            if (!isNaN(count)) {
                const cardName = parts.slice(1).join(' ').trim();
                cardNames.add(cardName.toLowerCase());
                continue;
            }
        }
        cardNames.add(line.trim().toLowerCase());
    }

    return Array.from(cardNames);
}

// Create basic card data for common cards
function createBasicCardData(cardName: string): EdHCard {
    const name = cardName.toLowerCase();
    
    // Basic lands
    const basicLands = ['plains', 'island', 'swamp', 'mountain', 'forest'];
    if (basicLands.includes(name)) {
        return {
            name: cardName,
            type_line: `Basic Land — ${cardName.charAt(0).toUpperCase() + cardName.slice(1)}`,
            colors: [],
            color_identity: [],
            rarity: 'common',
            legalities: { commander: 'legal' },
            mana_cost: '',
            cmc: 0
        };
    }
    
    // Legendary creatures (potential commanders)
    const legendaryCreatures = [
        'minthara, merciless soul',
        'atraxa, praetors\' voice',
        'edgar markov',
        'the ur-dragon'
    ];
    
    if (legendaryCreatures.includes(name)) {
        return {
            name: cardName,
            type_line: 'Legendary Creature',
            colors: ['W', 'B'], // Default to WB for most
            color_identity: ['W', 'B'],
            rarity: 'mythic',
            legalities: { commander: 'legal' },
            mana_cost: '{2}{W}{B}',
            cmc: 4
        };
    }
    
    // Default for other cards
    return {
        name: cardName,
        type_line: 'Unknown',
        colors: [],
        color_identity: [],
        rarity: 'common',
        legalities: { commander: 'legal' },
        mana_cost: '',
        cmc: 0
    };
}

async function addDeckCards(deckPath: string): Promise<void> {
    console.log(`📖 Reading deck from: ${deckPath}`);
    
    const deckContent = fs.readFileSync(deckPath, 'utf8');
    const cardNames = parseDeckCardNames(deckContent);
    
    console.log(`📦 Found ${cardNames.length} unique cards in deck`);
    
    const db = new CardDatabase();
    
    try {
        await db.connect();
        await db.initializeSchema();
        
        let added = 0;
        let skipped = 0;
        
        for (const cardName of cardNames) {
            try {
                // Check if card already exists
                const existing = await db.getCard(cardName);
                if (existing) {
                    skipped++;
                    continue;
                }
                
                // Create basic card data
                const card = createBasicCardData(cardName);
                await db.insertCard(card);
                added++;
                
            } catch (error) {
                console.warn(`⚠️ Failed to add card "${cardName}":`, error);
            }
        }
        
        const totalCount = await db.getCardCount();
        console.log(`✅ Deck cards added!`);
        console.log(`   Added: ${added} cards`);
        console.log(`   Skipped (already existed): ${skipped} cards`);
        console.log(`   Total in database: ${totalCount} cards`);
        
    } catch (error) {
        console.error('❌ Failed to add deck cards:', error);
        throw error;
    } finally {
        await db.close();
    }
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
Usage: npm run add-deck-cards <path-to-deck-file>

Adds all cards from a deck file to the database with basic card data.
This is useful for testing validation without needing the full Scryfall dataset.

Examples:
  npm run add-deck-cards ./decks/minthara.txt
  npm run add-deck-cards ./decks/my-commander-deck.txt
`);
        process.exit(0);
    }
    
    const deckPath = args[0];
    
    if (!fs.existsSync(deckPath)) {
        console.error(`❌ Error: Deck file not found: ${deckPath}`);
        process.exit(1);
    }
    
    try {
        await addDeckCards(deckPath);
        console.log('🎉 Success! You can now run validation on this deck.');
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
}