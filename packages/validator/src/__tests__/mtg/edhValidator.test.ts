import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import { 
    validateEdHDeck, 
    loadCardDatabase, 
    EDH_RULES
} from '../../edhValidator.js';
import type { EdHCard } from '../../types.js';

// Mock fs module
vi.mock('fs');

describe('EDH Validator', async () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('loadCardDatabase', async () => {
        it('should connect to database successfully', async () => {
            const result = await loadCardDatabase();
            expect(result).toBeDefined();
        });

    });

    describe('EDH Rules', async () => {
        describe('Deck Size Rule', async () => {
            it('should pass with exactly 100 cards', async () => {
                const cardCounts = Array.from({ length: 100 }, (_, i) => [`card${i}`, 1])
                    .reduce((acc, [name, count]) => ({ ...acc, [name]: count }), {});

                const deckSizeRule = EDH_RULES.find(rule => rule.id === 'deck_size')!;
                const violations = await deckSizeRule.check(cardCounts);

                expect(violations).toHaveLength(0);
            });

            it('should fail with less than 100 cards', async () => {
                const cardCounts = { 'card1': 1, 'card2': 1 };

                const deckSizeRule = EDH_RULES.find(rule => rule.id === 'deck_size')!;
                const violations = await deckSizeRule.check(cardCounts);

                expect(violations).toHaveLength(1);
                expect(violations[0].severity).toBe('error');
                expect(violations[0].message).toContain('2 cards');
            });

            it('should fail with more than 100 cards', async () => {
                const cardCounts = Array.from({ length: 105 }, (_, i) => [`card${i}`, 1])
                    .reduce((acc, [name, count]) => ({ ...acc, [name]: count }), {});

                const deckSizeRule = EDH_RULES.find(rule => rule.id === 'deck_size')!;
                const violations = await deckSizeRule.check(cardCounts);

                expect(violations).toHaveLength(1);
                expect(violations[0].severity).toBe('error');
                expect(violations[0].message).toContain('105 cards');
            });
        });

        describe('Singleton Rule', async () => {
            it('should pass with all single copies', async () => {
                const cardCounts = { 'lightning bolt': 1, 'counterspell': 1 };

                const singletonRule = EDH_RULES.find(rule => rule.id === 'singleton')!;
                const violations = await singletonRule.check(cardCounts);

                expect(violations).toHaveLength(0);
            });

            it('should fail with multiple copies of non-basic cards', async () => {
                const cardCounts = { 'lightning bolt': 4, 'counterspell': 2 };

                const singletonRule = EDH_RULES.find(rule => rule.id === 'singleton')!;
                const violations = await singletonRule.check(cardCounts);

                expect(violations).toHaveLength(2);
                expect(violations[0].severity).toBe('error');
                expect(violations[0].affectedCards).toEqual(['lightning bolt']);
                expect(violations[1].affectedCards).toEqual(['counterspell']);
            });

            it('should allow multiple basic lands with card data', async () => {
                const cardCounts = { 'plains': 8, 'island': 6 };
                const mockCardData = {
                    getCard: vi.fn().mockImplementation((name: string) => {
                        const cards: Record<string, EdHCard> = {
                            'plains': {
                                name: 'Plains',
                                colors: ['W'],
                                rarity: 'common',
                                color_identity: ['W'],
                                type_line: 'Basic Land — Plains',
                                legalities: { commander: 'legal' }
                            },
                            'island': {
                                name: 'Island',
                                colors: ['U'],
                                rarity: 'common',
                                color_identity: ['U'],
                                type_line: 'Basic Land — Island',
                                legalities: { commander: 'legal' }
                            }
                        };
                        return Promise.resolve(cards[name.toLowerCase()] || null);
                    })
                };

                const singletonRule = EDH_RULES.find(rule => rule.id === 'singleton')!;
                const violations = await singletonRule.check(cardCounts, mockCardData as import('../../database.js').CardDatabase);

                expect(violations).toHaveLength(0);
            });

            it('should allow multiple Relentless Rats', async () => {
                const cardCounts = { 'relentless rats': 20 };
                const mockCardData = {
                    getCard: vi.fn().mockImplementation((name: string) => {
                        const cards: Record<string, EdHCard> = {
                            'relentless rats': {
                                name: 'Relentless Rats',
                                colors: ['B'],
                                rarity: 'uncommon',
                                color_identity: ['B'],
                                type_line: 'Creature — Rat',
                                legalities: { commander: 'legal' }
                            }
                        };
                        return Promise.resolve(cards[name.toLowerCase()] || null);
                    })
                };

                const singletonRule = EDH_RULES.find(rule => rule.id === 'singleton')!;
                const violations = await singletonRule.check(cardCounts, mockCardData as import('../../database.js').CardDatabase);

                expect(violations).toHaveLength(0);
            });
        });

        describe('Commander Check Rule', async () => {
            it('should warn when no card data is available', async () => {
                const cardCounts = { 'atraxa, praetors\' voice': 1 };

                const commanderRule = EDH_RULES.find(rule => rule.id === 'commander_check')!;
                const violations = await commanderRule.check(cardCounts);

                expect(violations).toHaveLength(1);
                expect(violations[0].severity).toBe('warning');
                expect(violations[0].message).toContain('card data');
            });

            it('should pass with valid legendary commander', async () => {
                const cardCounts = { 'atraxa, praetors\' voice': 1 };
                const mockCardData = {
                    getCard: vi.fn().mockImplementation((name: string) => {
                        const cards: Record<string, EdHCard> = {
                            'atraxa, praetors\' voice': {
                        name: 'Atraxa, Praetors\' Voice',
                        colors: ['W', 'U', 'B', 'G'],
                        rarity: 'mythic',
                        color_identity: ['W', 'U', 'B', 'G'],
                        type_line: 'Legendary Creature — Phyrexian Angel Horror',
                        legalities: { commander: 'legal' }
                            }
                        };
                        return Promise.resolve(cards[name.toLowerCase()] || null);
                    })
                };

                const commanderRule = EDH_RULES.find(rule => rule.id === 'commander_check')!;
                const violations = await commanderRule.check(cardCounts, mockCardData as import('../../database.js').CardDatabase);

                expect(violations).toHaveLength(0);
            });

            it('should fail with no valid commanders', async () => {
                const cardCounts = { 'lightning bolt': 1, 'counterspell': 1 };
                const mockCardData = {
                    getCard: vi.fn().mockImplementation((name: string) => {
                        const cards: Record<string, EdHCard> = {
                            'lightning bolt': {
                        name: 'Lightning Bolt',
                        colors: ['R'],
                        rarity: 'common',
                        color_identity: ['R'],
                        type_line: 'Instant',
                        legalities: { commander: 'legal' }
                            },
                            'counterspell': {
                        name: 'Counterspell',
                        colors: ['U'],
                        rarity: 'common',
                        color_identity: ['U'],
                        type_line: 'Instant',
                        legalities: { commander: 'legal' }
                            }
                        };
                        return Promise.resolve(cards[name.toLowerCase()] || null);
                    })
                };

                const commanderRule = EDH_RULES.find(rule => rule.id === 'commander_check')!;
                const violations = await commanderRule.check(cardCounts, mockCardData as import('../../database.js').CardDatabase);

                expect(violations).toHaveLength(1);
                expect(violations[0].severity).toBe('error');
                expect(violations[0].message).toContain('No valid commander');
            });
        });

        describe('Format Legality Rule', async () => {
            it('should warn when no card data is available', async () => {
                const cardCounts = { 'black lotus': 1 };

                const legalityRule = EDH_RULES.find(rule => rule.id === 'format_legality')!;
                const violations = await legalityRule.check(cardCounts);

                expect(violations).toHaveLength(1);
                expect(violations[0].severity).toBe('warning');
            });

            it('should pass with legal cards', async () => {
                const cardCounts = { 'sol ring': 1, 'lightning bolt': 1 };
                const mockCardData = {
                    getCard: vi.fn().mockImplementation((name: string) => {
                        const cards: Record<string, EdHCard> = {
                            'sol ring': {
                        name: 'Sol Ring',
                        colors: [],
                        rarity: 'uncommon',
                        color_identity: [],
                        type_line: 'Artifact',
                        legalities: { commander: 'legal' }
                            },
                            'lightning bolt': {
                        name: 'Lightning Bolt',
                        colors: ['R'],
                        rarity: 'common',
                        color_identity: ['R'],
                        type_line: 'Instant',
                        legalities: { commander: 'legal' }
                            }
                        };
                        return Promise.resolve(cards[name.toLowerCase()] || null);
                    })
                };

                const legalityRule = EDH_RULES.find(rule => rule.id === 'format_legality')!;
                const violations = await legalityRule.check(cardCounts, mockCardData as import('../../database.js').CardDatabase);

                expect(violations).toHaveLength(0);
            });

            it('should fail with banned cards', async () => {
                const cardCounts = { 'black lotus': 1, 'ancestral recall': 1 };
                const mockCardData = {
                    getCard: vi.fn().mockImplementation((name: string) => {
                        const cards: Record<string, EdHCard> = {
                            'black lotus': {
                        name: 'Black Lotus',
                        colors: [],
                        rarity: 'special',
                        color_identity: [],
                        type_line: 'Artifact',
                        legalities: { commander: 'banned' }
                            },
                            'ancestral recall': {
                        name: 'Ancestral Recall',
                        colors: ['U'],
                        rarity: 'special',
                        color_identity: ['U'],
                        type_line: 'Instant',
                        legalities: { commander: 'banned' }
                            }
                        };
                        return Promise.resolve(cards[name.toLowerCase()] || null);
                    })
                };

                const legalityRule = EDH_RULES.find(rule => rule.id === 'format_legality')!;
                const violations = await legalityRule.check(cardCounts, mockCardData as import('../../database.js').CardDatabase);

                expect(violations).toHaveLength(2);
                expect(violations[0].severity).toBe('error');
                expect(violations[0].affectedCards).toEqual(['black lotus']);
                expect(violations[1].affectedCards).toEqual(['ancestral recall']);
            });
        });
    });

    describe('validateEdHDeck', async () => {
        it('should validate a simple deck list', async () => {
            // Mock loadScryfallData to return null (no data)
            vi.mocked(fs.existsSync).mockReturnValue(false);

            const deckList = `
                1 Lightning Bolt
                1 Counterspell
                1 Sol Ring
            `;

            const result = await validateEdHDeck(deckList);

            expect(result.totalCards).toBe(3);
            expect(result.isValid).toBe(false); // Should fail due to deck size
            expect(result.cardCounts).toEqual({
                'lightning bolt': 1,
                'counterspell': 1,
                'sol ring': 1
            });
        });

        it('should handle deck with quantity prefixes', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);

            const deckList = `
                4 Lightning Bolt
                3 Counterspell
                2 Sol Ring
            `;

            const result = await validateEdHDeck(deckList);

            expect(result.totalCards).toBe(9);
            expect(result.cardCounts).toEqual({
                'lightning bolt': 4,
                'counterspell': 3,
                'sol ring': 2
            });
        });

        it('should ignore comments and empty lines', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);

            const deckList = `
                # This is a comment
                1 Lightning Bolt
                
                // Another comment
                1 Counterspell
                
                1 Sol Ring
            `;

            const result = await validateEdHDeck(deckList);

            expect(result.totalCards).toBe(3);
            expect(result.cardCounts).toEqual({
                'lightning bolt': 1,
                'counterspell': 1,
                'sol ring': 1
            });
        });

        it('should integrate with card data when available', async () => {
            const mockCards: EdHCard[] = [
                {
                    name: 'Plains',
                    colors: ['W'],
                    rarity: 'common',
                    color_identity: ['W'],
                    type_line: 'Basic Land — Plains',
                    legalities: { commander: 'legal' }
                },
                {
                    name: 'Atraxa, Praetors\' Voice',
                    colors: ['W', 'U', 'B', 'G'],
                    rarity: 'mythic',
                    color_identity: ['W', 'U', 'B', 'G'],
                    type_line: 'Legendary Creature — Phyrexian Angel Horror',
                    legalities: { commander: 'legal' }
                }
            ];

            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockCards));

            const deckList = `
                1 Atraxa, Praetors' Voice
                8 Plains
            `;

            const result = await validateEdHDeck(deckList);

            expect(result.cardDb).toBeDefined();
            
            // Should not have singleton violations for basic lands
            const singletonViolations = result.violations.filter(v => v.ruleId === 'singleton');
            expect(singletonViolations).toHaveLength(0);
        });
    });

    describe('Integration with test fixtures', async () => {
        it('should load and validate fixture files', async () => {
            // Use the actual fixture content from the file
            const fixtureContent = `# Invalid EDH Deck - Multiple rule violations
# Problems: Too few cards, duplicate non-basics, no commander

4 Lightning Bolt
4 Counterspell
4 Sol Ring
2 Command Tower
4 Mountain
4 Island
1 Time Walk
1 Black Lotus
1 Mox Pearl
1 Mox Sapphire
1 Mox Ruby
1 Ancestral Recall
1 Force of Will
1 Brainstorm
1 Lightning Bolt
1 Shock
1 Bolt
2 Snapcaster Mage
3 Tarmogoyf`;

            vi.mocked(fs.existsSync).mockReturnValue(false); // No Scryfall data
            
            const result = await validateEdHDeck(fixtureContent);

            // Count: 4+4+4+2+4+4+1+1+1+1+1+1+1+1+1+1+1+2+3 = 38 cards
            // But Lightning Bolt appears twice (4 + 1), so actual unique cards differ
            expect(result.totalCards).toBe(38);
            expect(result.isValid).toBe(false);
            
            // Should have deck size violation
            const deckSizeViolations = result.violations.filter(v => v.ruleId === 'deck_size');
            expect(deckSizeViolations).toHaveLength(1);
            
            // Should have singleton violations
            const singletonViolations = result.violations.filter(v => v.ruleId === 'singleton');
            expect(singletonViolations.length).toBeGreaterThan(0);
            
            // Should have Lightning Bolt combined count
            expect(result.cardCounts['lightning bolt']).toBe(5); // 4 + 1 from both entries
        });
    });
});