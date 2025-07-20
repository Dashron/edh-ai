import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
    validateEdHDeck, 
    loadCardDatabase, 
    EDH_RULES
} from '../edhValidator.js';
import { CardDatabase } from '../database.js';

// Mock the CardDatabase
vi.mock('../database.js');

describe('EDH Validator', () => {
    let mockDb: CardDatabase;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Create a mock database instance
        mockDb = {
            connect: vi.fn().mockResolvedValue(undefined),
            getCardCount: vi.fn().mockResolvedValue(100),
            getCard: vi.fn(),
            close: vi.fn().mockResolvedValue(undefined)
        };

        // Mock the CardDatabase constructor
        vi.mocked(CardDatabase).mockImplementation(() => mockDb);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('loadCardDatabase', () => {
        it('should successfully connect to database and return instance', async () => {
            mockDb.getCardCount.mockResolvedValue(50000);
            
            const result = await loadCardDatabase();
            
            expect(result).toBe(mockDb);
            expect(mockDb.connect).toHaveBeenCalled();
            expect(mockDb.getCardCount).toHaveBeenCalled();
        });

        it('should return null if database is empty', async () => {
            mockDb.getCardCount.mockResolvedValue(0);
            
            const result = await loadCardDatabase();
            
            expect(result).toBeNull();
            expect(mockDb.close).toHaveBeenCalled();
        });

        it('should return null on connection error', async () => {
            mockDb.connect.mockRejectedValue(new Error('Connection failed'));
            
            const result = await loadCardDatabase();
            
            expect(result).toBeNull();
        });
    });

    describe('EDH Rules', () => {
        it('should have all required validation rules', () => {
            expect(EDH_RULES).toHaveLength(4);
            
            const ruleIds = EDH_RULES.map(rule => rule.id);
            expect(ruleIds).toContain('deck_size');
            expect(ruleIds).toContain('singleton');
            expect(ruleIds).toContain('commander_check');
            expect(ruleIds).toContain('format_legality');
        });

        describe('deck_size rule', () => {
            it('should pass for exactly 100 cards', async () => {
                const rule = EDH_RULES.find(r => r.id === 'deck_size')!;
                const cardCounts = { 'sol ring': 1, 'plains': 99 };
                
                const violations = await rule.check(cardCounts);
                
                expect(violations).toHaveLength(0);
            });

            it('should fail for wrong number of cards', async () => {
                const rule = EDH_RULES.find(r => r.id === 'deck_size')!;
                const cardCounts = { 'sol ring': 1, 'plains': 98 }; // 99 total
                
                const violations = await rule.check(cardCounts);
                
                expect(violations).toHaveLength(1);
                expect(violations[0].severity).toBe('error');
                expect(violations[0].message).toContain('99 cards');
            });
        });

        describe('singleton rule', () => {
            it('should pass for basic lands with multiple copies', async () => {
                const rule = EDH_RULES.find(r => r.id === 'singleton')!;
                const cardCounts = { 'plains': 10, 'sol ring': 1 };
                
                // Mock Plains as a basic land
                mockDb.getCard.mockImplementation((name: string) => {
                    if (name === 'plains') {
                        return Promise.resolve({
                            name: 'Plains',
                            type_line: 'Basic Land — Plains',
                            colors: [],
                            color_identity: [],
                            rarity: 'common'
                        });
                    }
                    return Promise.resolve({
                        name: 'Sol Ring',
                        type_line: 'Artifact',
                        colors: [],
                        color_identity: [],
                        rarity: 'uncommon'
                    });
                });
                
                const violations = await rule.check(cardCounts, mockDb);
                
                expect(violations).toHaveLength(0);
            });

            it('should fail for non-basic cards with multiple copies', async () => {
                const rule = EDH_RULES.find(r => r.id === 'singleton')!;
                const cardCounts = { 'sol ring': 2 };
                
                // Mock Sol Ring as non-basic
                mockDb.getCard.mockResolvedValue({
                    name: 'Sol Ring',
                    type_line: 'Artifact',
                    colors: [],
                    color_identity: [],
                    rarity: 'uncommon'
                });
                
                const violations = await rule.check(cardCounts, mockDb);
                
                expect(violations).toHaveLength(1);
                expect(violations[0].severity).toBe('error');
                expect(violations[0].message).toContain('2 copies');
            });
        });

        describe('commander_check rule', () => {
            it('should pass with a valid commander in regular EDH', async () => {
                const rule = EDH_RULES.find(r => r.id === 'commander_check')!;
                const cardCounts = { 'atraxa, praetors\' voice': 1 };
                
                // Mock Atraxa as legendary creature
                mockDb.getCard.mockResolvedValue({
                    name: 'Atraxa, Praetors\' Voice',
                    type_line: 'Legendary Creature — Phyrexian Angel Horror',
                    colors: ['W', 'U', 'B', 'G'],
                    color_identity: ['W', 'U', 'B', 'G'],
                    rarity: 'mythic'
                });
                
                const violations = await rule.check(cardCounts, mockDb, false);
                
                expect(violations).toHaveLength(0);
            });

            it('should pass with a valid commander in pauper EDH', async () => {
                const rule = EDH_RULES.find(r => r.id === 'commander_check')!;
                const cardCounts = { 'crypt rats': 1 };
                
                // Mock Crypt Rats as uncommon creature
                mockDb.getCard.mockResolvedValue({
                    name: 'Crypt Rats',
                    type_line: 'Creature — Rat',
                    colors: ['B'],
                    color_identity: ['B'],
                    rarity: 'uncommon'
                });
                
                const violations = await rule.check(cardCounts, mockDb, true);
                
                expect(violations).toHaveLength(0);
            });

            it('should fail without a valid commander in regular EDH', async () => {
                const rule = EDH_RULES.find(r => r.id === 'commander_check')!;
                const cardCounts = { 'sol ring': 1 };
                
                // Mock Sol Ring as non-legendary
                mockDb.getCard.mockResolvedValue({
                    name: 'Sol Ring',
                    type_line: 'Artifact',
                    colors: [],
                    color_identity: [],
                    rarity: 'uncommon'
                });
                
                const violations = await rule.check(cardCounts, mockDb, false);
                
                expect(violations).toHaveLength(1);
                expect(violations[0].severity).toBe('error');
                expect(violations[0].message).toContain('legendary creature or planeswalker');
            });

            it('should fail without a valid commander in pauper EDH', async () => {
                const rule = EDH_RULES.find(r => r.id === 'commander_check')!;
                const cardCounts = { 'sol ring': 1 };
                
                // Mock Sol Ring as non-creature
                mockDb.getCard.mockResolvedValue({
                    name: 'Sol Ring',
                    type_line: 'Artifact',
                    colors: [],
                    color_identity: [],
                    rarity: 'uncommon'
                });
                
                const violations = await rule.check(cardCounts, mockDb, true);
                
                expect(violations).toHaveLength(1);
                expect(violations[0].severity).toBe('error');
                expect(violations[0].message).toContain('uncommon creature');
            });

            it('should reject legendary creature with wrong rarity in pauper EDH', async () => {
                const rule = EDH_RULES.find(r => r.id === 'commander_check')!;
                const cardCounts = { 'atraxa, praetors\' voice': 1 };
                
                // Mock Atraxa as legendary but mythic (not uncommon)
                mockDb.getCard.mockResolvedValue({
                    name: 'Atraxa, Praetors\' Voice',
                    type_line: 'Legendary Creature — Phyrexian Angel Horror',
                    colors: ['W', 'U', 'B', 'G'],
                    color_identity: ['W', 'U', 'B', 'G'],
                    rarity: 'mythic'
                });
                
                const violations = await rule.check(cardCounts, mockDb, true);
                
                expect(violations).toHaveLength(1);
                expect(violations[0].severity).toBe('error');
                expect(violations[0].message).toContain('uncommon creature');
            });
        });

        describe('format_legality rule', () => {
            it('should pass for legal cards in regular EDH', async () => {
                const rule = EDH_RULES.find(r => r.id === 'format_legality')!;
                const cardCounts = { 'sol ring': 1 };
                
                mockDb.getCard.mockResolvedValue({
                    name: 'Sol Ring',
                    type_line: 'Artifact',
                    colors: [],
                    color_identity: [],
                    rarity: 'uncommon',
                    legalities: { commander: 'legal' }
                });
                
                const violations = await rule.check(cardCounts, mockDb, false);
                
                expect(violations).toHaveLength(0);
            });

            it('should fail for banned cards in regular EDH', async () => {
                const rule = EDH_RULES.find(r => r.id === 'format_legality')!;
                const cardCounts = { 'black lotus': 1 };
                
                mockDb.getCard.mockResolvedValue({
                    name: 'Black Lotus',
                    type_line: 'Artifact',
                    colors: [],
                    color_identity: [],
                    rarity: 'rare',
                    legalities: { commander: 'banned' }
                });
                
                const violations = await rule.check(cardCounts, mockDb, false);
                
                expect(violations).toHaveLength(1);
                expect(violations[0].severity).toBe('error');
                expect(violations[0].message).toContain('banned in Commander');
            });

            it('should pass for common cards in pauper EDH', async () => {
                const rule = EDH_RULES.find(r => r.id === 'format_legality')!;
                const cardCounts = { 'llanowar elves': 1 };
                
                mockDb.getCard.mockResolvedValue({
                    name: 'Llanowar Elves',
                    type_line: 'Creature — Elf Druid',
                    colors: ['G'],
                    color_identity: ['G'],
                    rarity: 'common',
                    legalities: { pauper: 'legal' }
                });
                
                const violations = await rule.check(cardCounts, mockDb, true);
                
                expect(violations).toHaveLength(0);
            });

            it('should fail for non-common cards in pauper EDH deck', async () => {
                const rule = EDH_RULES.find(r => r.id === 'format_legality')!;
                const cardCounts = { 'sol ring': 1, 'crypt rats': 1 };
                
                mockDb.getCard.mockImplementation((name: string) => {
                    if (name === 'sol ring') {
                        return Promise.resolve({
                            name: 'Sol Ring',
                            type_line: 'Artifact',
                            colors: [],
                            color_identity: [],
                            rarity: 'uncommon',
                            legalities: { pauper: 'legal' }
                        });
                    }
                    return Promise.resolve({
                        name: 'Crypt Rats',
                        type_line: 'Creature — Rat',
                        colors: ['B'],
                        color_identity: ['B'],
                        rarity: 'uncommon',
                        legalities: { pauper: 'legal' }
                    });
                });
                
                const violations = await rule.check(cardCounts, mockDb, true);
                
                expect(violations).toHaveLength(1);
                expect(violations[0].severity).toBe('error');
                expect(violations[0].message).toContain('must be common rarity');
                expect(violations[0].affectedCards).toContain('sol ring');
            });

            it('should allow uncommon commanders in pauper EDH', async () => {
                const rule = EDH_RULES.find(r => r.id === 'format_legality')!;
                const cardCounts = { 'crypt rats': 1, 'llanowar elves': 1 };
                
                mockDb.getCard.mockImplementation((name: string) => {
                    if (name === 'crypt rats') {
                        return Promise.resolve({
                            name: 'Crypt Rats',
                            type_line: 'Creature — Rat',
                            colors: ['B'],
                            color_identity: ['B'],
                            rarity: 'uncommon',
                            legalities: { pauper: 'legal' }
                        });
                    }
                    return Promise.resolve({
                        name: 'Llanowar Elves',
                        type_line: 'Creature — Elf Druid',
                        colors: ['G'],
                        color_identity: ['G'],
                        rarity: 'common',
                        legalities: { pauper: 'legal' }
                    });
                });
                
                const violations = await rule.check(cardCounts, mockDb, true);
                
                expect(violations).toHaveLength(0);
            });
        });
    });

    describe('validateEdHDeck', () => {
        it('should validate a proper EDH deck', async () => {
            const deckList = `
1 Atraxa, Praetors' Voice
1 Sol Ring
98 Plains
            `.trim();

            // Mock the database connection
            mockDb.getCardCount.mockResolvedValue(100);
            mockDb.getCard.mockImplementation((name: string) => {
                if (name === 'plains') {
                    return Promise.resolve({
                        name: 'Plains',
                        type_line: 'Basic Land — Plains',
                        colors: [],
                        color_identity: [],
                        rarity: 'common'
                    });
                }
                if (name === 'atraxa, praetors\' voice') {
                    return Promise.resolve({
                        name: 'Atraxa, Praetors\' Voice',
                        type_line: 'Legendary Creature — Phyrexian Angel Horror',
                        colors: ['W', 'U', 'B', 'G'],
                        color_identity: ['W', 'U', 'B', 'G'],
                        rarity: 'mythic',
                        legalities: { commander: 'legal' }
                    });
                }
                return Promise.resolve({
                    name: 'Sol Ring',
                    type_line: 'Artifact',
                    colors: [],
                    color_identity: [],
                    rarity: 'uncommon',
                    legalities: { commander: 'legal' }
                });
            });

            const result = await validateEdHDeck(deckList);

            expect(result.isValid).toBe(true);
            expect(result.totalCards).toBe(100);
            expect(result.violations.filter(v => v.severity === 'error')).toHaveLength(0);
            
            // Close the database manually since validateEdHDeck doesn't close it
            if (result.cardDb) {
                await result.cardDb.close();
            }
            expect(mockDb.close).toHaveBeenCalled();
        });

        it('should validate a proper pauper EDH deck', async () => {
            const deckList = `
1 Crypt Rats
1 Llanowar Elves
98 Swamp
            `.trim();

            // Mock the database connection
            mockDb.getCardCount.mockResolvedValue(100);
            mockDb.getCard.mockImplementation((name: string) => {
                if (name === 'swamp') {
                    return Promise.resolve({
                        name: 'Swamp',
                        type_line: 'Basic Land — Swamp',
                        colors: [],
                        color_identity: [],
                        rarity: 'common'
                    });
                }
                if (name === 'crypt rats') {
                    return Promise.resolve({
                        name: 'Crypt Rats',
                        type_line: 'Creature — Rat',
                        colors: ['B'],
                        color_identity: ['B'],
                        rarity: 'uncommon',
                        legalities: { pauper: 'legal' }
                    });
                }
                return Promise.resolve({
                    name: 'Llanowar Elves',
                    type_line: 'Creature — Elf Druid',
                    colors: ['G'],
                    color_identity: ['G'],
                    rarity: 'common',
                    legalities: { pauper: 'legal' }
                });
            });

            const result = await validateEdHDeck(deckList, true);

            expect(result.isValid).toBe(true);
            expect(result.totalCards).toBe(100);
            expect(result.violations.filter(v => v.severity === 'error')).toHaveLength(0);
            
            // Close the database manually since validateEdHDeck doesn't close it
            if (result.cardDb) {
                await result.cardDb.close();
            }
            expect(mockDb.close).toHaveBeenCalled();
        });

        it('should reject deck without database', async () => {
            mockDb.getCardCount.mockResolvedValue(0);
            
            const deckList = '1 Sol Ring';

            await expect(validateEdHDeck(deckList)).rejects.toThrow('Card database is required');
        });
    });
});