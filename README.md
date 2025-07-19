# EDH AI

A sophisticated TypeScript CLI tool for validating Magic: The Gathering EDH (Elder Dragon Highlander/Commander) deck files against official format rules, designed for integration with Claude Code.

## Features

### Comprehensive Deck Validation
- **Deck Size Validation**: Ensures exactly 100 cards per EDH rules
- **Singleton Rule Enforcement**: No more than 1 copy of any card (except basic lands and special exceptions)
- **Basic Land Support**: Properly allows multiple copies of basic lands (Plains, Island, Swamp, Mountain, Forest)
- **Commander Detection**: Identifies valid legendary creatures/planeswalkers that can serve as commanders
- **Format Legality Checking**: Validates cards against the Commander ban list
- **Special Card Support**: Handles cards like Relentless Rats that allow multiple copies

### Technical Features
- **SQLite Database**: Efficient local card data storage with optimized indexing
- **Scryfall Integration**: Import comprehensive MTG card data from Scryfall's API
- **Streaming Import**: Memory-optimized processing of large datasets (2GB+)
- **Real-time Progress**: Detailed progress reporting with memory usage tracking
- **Comprehensive Testing**: Full test suite with 31 passing tests

## Installation

```bash
npm install
```

## Quick Start

### Option 1: Quick Setup (Recommended for Testing)
```bash
# Add just the cards from your deck to the database
npm run add-deck-cards ./decks/minthara.txt

# Validate your deck
npm run edh-validate ./decks/minthara.txt
```

### Option 2: Full Database Setup
```bash
# Download latest Scryfall data (~2.3GB)
npm run download-cards

# Import all cards with memory optimization
npm run import-cards data/all-cards.json

# Validate any deck
npm run edh-validate ./decks/minthara.txt
```

## Commands

### Core Validation
- **`npm run edh-validate <deck-file>`** - Validate an EDH deck file against all format rules

### Database Management
- **`npm run download-cards`** - Download latest Scryfall dataset using their bulk data API
- **`npm run import-cards <json-file>`** - Import Scryfall data with streaming parser and memory optimization
- **`npm run reset-db`** - Clear/reset the SQLite card database
- **`npm run add-deck-cards <deck-file>`** - Quick database population with specific deck cards

### Development
- **`npm run build`** - Compile TypeScript to JavaScript
- **`npm test`** - Run comprehensive test suite (31 tests)
- **`npm run test:watch`** - Run tests in watch mode
- **`npm run lint`** - Run ESLint on source code
- **`npm run clean`** - Remove compiled artifacts

## Deck File Format

EDH AI supports the standard MTG deck format with flexible parsing:

```
# This is a comment
1 Sol Ring
4 Lightning Bolt
12 Plains
11 Swamp
1 Minthara, Merciless Soul

// Another comment style
Forest
Mountain  # Quantity defaults to 1
```

**Format Features:**
- One card per line with optional quantity prefix
- Quantity defaults to 1 if not specified
- Card names are case-insensitive
- Supports `//` and `#` style comments
- Ignores empty lines

## Validation Rules

The tool implements four comprehensive EDH validation rules:

1. **Deck Size** - Must contain exactly 100 cards
2. **Singleton Rule** - Maximum 1 copy of any card except:
   - Basic lands (Plains, Island, Swamp, Mountain, Forest)
   - Special cards like Relentless Rats, Rat Colony, Persistent Petitioners
3. **Commander Check** - Must contain at least one valid commander:
   - Legendary creature, or
   - Legendary planeswalker, or
   - Card with "can be your commander" text
4. **Format Legality** - No cards banned in Commander format

## Example Output

### Valid Deck
```
📖 Reading deck from: ./decks/minthara.txt
📖 Connecting to card database...
✅ Connected to card database with 31294 cards.

=== EDH Deck Validation Results ===
Total Cards: 100
Valid: ✅

✅ No violations found. Deck is valid!

=== Commander Analysis ===
Potential Commanders:
  • Minthara, Merciless Soul (WB)

=== Card Summary ===
1x Minthara, Merciless Soul
1x Sol Ring
8x Plains
6x Swamp
[... additional cards]
```

### Invalid Deck
```
❌ EDH Deck Validation Results
Total Cards: 101
Valid: ❌

Violations Found:
❌ [Deck Size] Deck must contain exactly 100 cards. Found 101 cards.
❌ [Singleton Rule] Found 2 copies of "sol ring". Only 1 copy allowed.
❌ [Format Legality] "Black Lotus" is banned in Commander format.
```

## Architecture

### Core Components
- **`edhValidator.ts`** - Rule-based validation engine with async database integration
- **`database.ts`** - SQLite interface with Promise wrappers and optimized schema
- **`edhCli.ts`** - User-friendly CLI with detailed output formatting
- **`importCards.ts`** - Streaming JSON parser with memory management for large datasets
- **`addDeckCards.ts`** - Quick database population utility
- **`types.ts`** - Comprehensive TypeScript interfaces

### Performance Optimizations
- **Streaming Architecture**: Processes large JSON files without loading everything into memory
- **Database Indexing**: Optimized SQLite schema with indexes on frequently queried fields
- **Memory Management**: 8GB heap limit with periodic garbage collection during imports
- **Efficient Filtering**: Early filtering of non-playable cards (tokens, art cards)

## Database Schema

The SQLite database (`data/cards.db`) stores comprehensive card information:

```sql
CREATE TABLE cards (
    name TEXT PRIMARY KEY,           -- Card name (case-insensitive lookups)
    type_line TEXT NOT NULL,         -- Card type (e.g., "Legendary Creature — Angel")
    colors TEXT NOT NULL,            -- JSON array of colors ["W", "U", "B", "R", "G"]
    color_identity TEXT NOT NULL,    -- JSON array for Commander color identity
    rarity TEXT NOT NULL,            -- Card rarity (common, uncommon, rare, mythic)
    legalities TEXT NOT NULL,        -- JSON object with format legalities
    mana_cost TEXT,                  -- Mana cost string (e.g., "{3}{W}{B}")
    cmc REAL                         -- Converted mana cost
);

-- Performance indexes
CREATE INDEX idx_type_line ON cards(type_line);
CREATE INDEX idx_legalities ON cards(legalities);
CREATE INDEX idx_rarity ON cards(rarity);
```

## Data Sources

**Scryfall Integration**: Uses Scryfall's bulk data API for comprehensive MTG card information:
- **All Cards**: Complete dataset with all printings (~2.3GB, 600k+ cards)
- **Oracle Cards**: Unique cards only (~150MB, 30k+ cards)
- **Automatic Updates**: Downloads latest data using Scryfall's bulk data API endpoints

## Development

### Technology Stack
- **Node.js 18+** with ES modules
- **TypeScript** with strict compilation (ES2022 target)
- **SQLite3** with custom Promise wrappers
- **Vitest** for testing with mocking capabilities
- **ESLint** for code quality
- **Stream-JSON** for memory-efficient large file processing

### Testing
```bash
# Run all tests (31 tests)
npm test

# Watch mode for development
npm run test:watch

# Run specific test file
npx vitest run src/__tests__/edhValidator.test.ts
```

**Test Coverage:**
- Unit tests for each validation rule
- Database operation mocking
- Integration tests with real deck files
- Edge case handling (special cards, format exceptions)

### Project Structure
```
edh-ai/
├── src/                           # TypeScript source code
│   ├── __tests__/                 # Comprehensive test suite
│   │   ├── fixtures/              # Test deck files
│   │   ├── edhValidator.test.ts   # Main validation tests
│   │   └── mtg/                   # Additional test files
│   ├── edhValidator.ts            # Core validation logic (313 lines)
│   ├── database.ts                # SQLite interface (191 lines)
│   ├── edhCli.ts                  # CLI entry point (91 lines)
│   ├── importCards.ts             # Streaming import (187 lines)
│   ├── addDeckCards.ts            # Quick setup utility (173 lines)
│   └── types.ts                   # TypeScript interfaces (51 lines)
├── decks/                         # Sample deck files (gitignored)
├── data/                          # Database and downloaded data (gitignored)
├── dist/                          # Compiled JavaScript output
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
├── vitest.config.ts               # Test configuration
├── CLAUDE.md                      # Developer guidance for Claude Code
└── README.md                      # This file
```

## Memory Requirements

- **Basic Usage**: ~50MB RAM for validation
- **Database Import**: 8GB heap limit recommended for large datasets
- **Disk Space**: ~3GB for complete Scryfall dataset plus SQLite database

## Version

**1.0.0-alpha.1** - Early development release with core functionality

## License

MIT - See LICENSE file for details

## Contributing

This project is designed for integration with Claude Code. See CLAUDE.md for detailed developer guidance and architectural information.