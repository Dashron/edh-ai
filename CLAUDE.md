# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an EDH/Commander Magic: The Gathering deck validator CLI tool written in TypeScript. It validates deck files against official EDH format rules using a SQLite database for card data storage.

## Common Commands

### Development Commands
```bash
# Build the project
npm run build

# Run tests
npm run test

# Run tests once (non-watch mode)
npm run test:run

# Lint code
npm run lint

# Clean build artifacts
npm run clean
```

### Application Commands
```bash
# Validate an EDH deck
npm run edh-validate <deck-file>

# Add cards from a deck file to the database (for testing)
npm run add-deck-cards <deck-file>

# Download latest Scryfall card data
npm run download-cards

# Reset/clear the card database
npm run reset-db

# Import full Scryfall card dataset
npm run import-cards <scryfall-json-file>
```

### Testing Commands
```bash
# Run all tests
npm run test

# Run tests in a single file
npx vitest run src/edhValidator.test.ts

# Run tests with coverage
npx vitest run --coverage
```

## Architecture

### Core Components

- **`edhValidator.ts`** - Main validation engine containing EDH rules and validation logic
- **`database.ts`** - SQLite database interface for card data storage and retrieval
- **`edhCli.ts`** - CLI entry point and argument parsing
- **`types.ts`** - TypeScript interfaces for cards and validation results
- **`importCards.ts`** - Scryfall JSON data import functionality
- **`addDeckCards.ts`** - Quick deck-based database population utility

### Validation System

The validator uses a rule-based architecture where each EDH rule is implemented as a separate validation function:

1. **Deck Size Rule** - Ensures exactly 100 cards
2. **Singleton Rule** - Enforces 1-copy limit (except basic lands and special cases)
3. **Commander Check** - Verifies presence of valid legendary creature/planeswalker
4. **Format Legality** - Checks against Commander ban list

### Database Schema

SQLite database (`data/cards.db`) stores card information:
- Card names (primary key)
- Type lines, colors, color identity
- Legalities (JSON format)
- Mana cost and converted mana cost

### Data Flow

1. Deck file is parsed into card names and quantities
2. Card data is looked up in SQLite database
3. Validation rules are executed against the deck
4. Results are formatted and displayed to user

## File Structure

- `src/` - TypeScript source code
- `src/__tests__/` - Test files using Vitest
- `decks/` - Sample deck files
- `data/` - SQLite database storage
- `dist/` - Compiled JavaScript output (created by build)

## Development Notes

- Uses ES modules with `.js` imports (compiled from TypeScript)
- SQLite3 for database operations with Promise wrappers
- Vitest for testing framework
- ESLint for code linting
- All validation rules are async to support database lookups
- Cards are stored with case-insensitive lookups