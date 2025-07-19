import type { EdHCard, EdHValidationRule, RuleViolation, EdHValidationResult } from './types.js';
import { CardDatabase } from './database.js';

// Helper function to load card data from SQLite database
export async function loadCardDatabase(): Promise<CardDatabase | null> {
    try {
        console.log('📖 Connecting to card database...');
        const db = new CardDatabase();
        await db.connect();
        
        const cardCount = await db.getCardCount();
        if (cardCount === 0) {
            console.log('📁 Card database is empty. Run "npm run import-cards <path-to-scryfall-json>" to populate it.');
            await db.close();
            return null;
        }
        
        console.log(`✅ Connected to card database with ${cardCount} cards.`);
        return db;
    } catch (error) {
        console.error('❌ Error connecting to card database:', error);
        return null;
    }
}

// Helper functions for card validation
function isBasicLand(card: EdHCard): boolean {
    if (!card.type_line) return false;
    const typeLine = card.type_line.toLowerCase();
    
    // Check if it has "Basic" in the type line
    return typeLine.includes('basic') && typeLine.includes('land');
}

function allowsMultipleCopies(card: EdHCard): boolean {
    const name = card.name.toLowerCase();
    const multipleAllowed = [
        'relentless rats', 'rat colony', 'persistent petitioners',
        'shadowborn apostle', 'thrumming stone'
    ];
    
    return multipleAllowed.includes(name);
}

function isLegalCommander(card: EdHCard): boolean {
    if (!card.type_line) return false;
    const typeLine = card.type_line.toLowerCase();
    
    // Must be legendary and a creature or planeswalker that can be a commander
    const isLegendary = typeLine.includes('legendary');
    const isCreature = typeLine.includes('creature');
    const isPlaneswalker = typeLine.includes('planeswalker');
    
    // Check for specific commander abilities (simplified)
    const canBeCommander = isLegendary && (isCreature || isPlaneswalker);
    
    return canBeCommander;
}

export const EDH_RULES: EdHValidationRule[] = [
    {
        id: 'deck_size',
        name: 'Deck Size',
        description: 'EDH decks must contain exactly 100 cards',
        check: async (cardCounts: Record<string, number>) => {
            const totalCards = Object.values(cardCounts).reduce((sum, count) => sum + count, 0);
            if (totalCards !== 100) {
                return [{
                    ruleId: 'deck_size',
                    ruleName: 'Deck Size',
                    message: `Deck must contain exactly 100 cards. Found ${totalCards} cards.`,
                    severity: 'error'
                }];
            }
            return [];
        }
    },
    {
        id: 'singleton',
        name: 'Singleton Rule',
        description: 'No more than one copy of any card except basic lands and specific exceptions',
        check: async (cardCounts: Record<string, number>, cardDb?: CardDatabase) => {
            const violations: RuleViolation[] = [];
            
            for (const [cardName, count] of Object.entries(cardCounts)) {
                if (count > 1) {
                    let card: EdHCard | null = null;
                    if (cardDb) {
                        card = await cardDb.getCard(cardName);
                    }
                    
                    // Allow multiple copies if it's a basic land or has special text allowing it
                    const allowMultiple = card ? 
                        (isBasicLand(card) || allowsMultipleCopies(card)) : 
                        false;
                    
                    if (!allowMultiple) {
                        violations.push({
                            ruleId: 'singleton',
                            ruleName: 'Singleton Rule',
                            message: `Found ${count} copies of "${cardName}". Only 1 copy allowed.`,
                            severity: 'error',
                            affectedCards: [cardName]
                        });
                    }
                }
            }
            
            return violations;
        }
    },
    {
        id: 'commander_check',
        name: 'Commander Required',
        description: 'Deck must have a designated commander',
        check: async (cardCounts: Record<string, number>, cardDb?: CardDatabase) => {
            if (!cardDb) {
                return [{
                    ruleId: 'commander_check',
                    ruleName: 'Commander Required',
                    message: 'Cannot verify commander without card database.',
                    severity: 'warning'
                }];
            }
            
            const possibleCommanders: EdHCard[] = [];
            for (const cardName of Object.keys(cardCounts)) {
                const card = await cardDb.getCard(cardName);
                if (card && isLegalCommander(card)) {
                    possibleCommanders.push(card);
                }
            }
            
            if (possibleCommanders.length === 0) {
                return [{
                    ruleId: 'commander_check',
                    ruleName: 'Commander Required',
                    message: 'No valid commander found. Deck must contain a legendary creature or planeswalker.',
                    severity: 'error'
                }];
            }
            
            return [];
        }
    },
    {
        id: 'format_legality',
        name: 'Format Legality',
        description: 'All cards must be legal in Commander format',
        check: async (cardCounts: Record<string, number>, cardDb?: CardDatabase) => {
            if (!cardDb) {
                return [{
                    ruleId: 'format_legality',
                    ruleName: 'Format Legality',
                    message: 'Cannot verify format legality without card database.',
                    severity: 'warning'
                }];
            }
            
            const violations: RuleViolation[] = [];
            
            for (const cardName of Object.keys(cardCounts)) {
                const card = await cardDb.getCard(cardName);
                if (card && card.legalities) {
                    const commanderLegality = card.legalities.commander;
                    if (commanderLegality === 'banned') {
                        violations.push({
                            ruleId: 'format_legality',
                            ruleName: 'Format Legality',
                            message: `"${cardName}" is banned in Commander format.`,
                            severity: 'error',
                            affectedCards: [cardName]
                        });
                    }
                }
            }
            
            return violations;
        }
    }
];

// Function to parse a deck from a string (reusing logic from mtg.ts)
function parseDeck(deckString: string): string[] {
    const lines = deckString.split('\n');
    const deck: string[] = [];

    for (const line of lines) {
        if (line.trim() === '' || line.trim().startsWith('//') || line.trim().startsWith('#')) {
            continue; // Skip empty lines and comments
        }
        
        const parts = line.trim().split(' ');

        if (parts.length > 1) {
            const count = parseInt(parts[0], 10);
            if (!isNaN(count)) {
                const cardName = parts.slice(1).join(' ').trim();
                for (let i = 0; i < count; i++) {
                    deck.push(cardName);
                }
                continue;
            }
        }

        deck.push(line.trim());
    }

    return deck;
}

// Function to count cards in a deck
function countCards(deck: string[]): Record<string, number> {
    const cardCounts: Record<string, number> = {};
    for (const card of deck) {
        const normalizedCard = card.toLowerCase();
        cardCounts[normalizedCard] = (cardCounts[normalizedCard] || 0) + 1;
    }
    return cardCounts;
}

export async function validateEdHDeck(deckList: string): Promise<EdHValidationResult> {
    const deck = parseDeck(deckList);
    const cardCounts = countCards(deck);
    const totalCards = deck.length;
    
    // Load card database
    const cardDb = await loadCardDatabase();
    
    // If card database failed to load, don't run validations
    if (!cardDb) {
        throw new Error('Card database is required for validation. Please run "npm run import-cards <path-to-scryfall-json>" first.');
    }
    
    let violations: RuleViolation[] = [];
    
    // Run all validation rules
    for (const rule of EDH_RULES) {
        const ruleViolations = await rule.check(cardCounts, cardDb);
        violations = violations.concat(ruleViolations);
    }
    
    const isValid = violations.filter(v => v.severity === 'error').length === 0;
    
    return {
        isValid,
        totalCards,
        violations,
        cardCounts,
        cardDb
    };
}

export async function runEdHValidation(deckList: string): Promise<void> {
    const result = await validateEdHDeck(deckList);
    
    try {
        console.log(`\n=== EDH Deck Validation Results ===`);
        console.log(`Total Cards: ${result.totalCards}`);
        console.log(`Valid: ${result.isValid ? '✅' : '❌'}`);
        
        if (result.violations.length > 0) {
            console.log(`\nViolations Found:`);
            for (const violation of result.violations) {
                const icon = violation.severity === 'error' ? '❌' : '⚠️';
                console.log(`${icon} [${violation.ruleName}] ${violation.message}`);
                if (violation.affectedCards && violation.affectedCards.length > 0) {
                    console.log(`   Affected cards: ${violation.affectedCards.join(', ')}`);
                }
            }
        } else {
            console.log(`\n✅ No violations found. Deck is valid!`);
        }
        
        if (result.cardDb) {
            console.log(`\n=== Commander Analysis ===`);
            const commanders: EdHCard[] = [];
            
            for (const cardName of Object.keys(result.cardCounts)) {
                const card = await result.cardDb.getCard(cardName);
                if (card && isLegalCommander(card)) {
                    commanders.push(card);
                }
            }
            
            if (commanders.length > 0) {
                console.log('Potential Commanders:');
                for (const commander of commanders) {
                    const colors = commander.color_identity.length > 0 ? 
                        commander.color_identity.join('') : 'Colorless';
                    console.log(`  • ${commander.name} (${colors})`);
                }
            }
        }
        
        console.log(`\n=== Card Summary ===`);
        const sortedCards = Object.entries(result.cardCounts)
            .sort(([a], [b]) => a.localeCompare(b));
        
        for (const [card, count] of sortedCards) {
            if (count > 1) {
                console.log(`${count}x ${card}`);
            } else {
                console.log(`1x ${card}`);
            }
        }
    } finally {
        // Always close the database connection
        if (result.cardDb) {
            await result.cardDb.close();
        }
    }
}