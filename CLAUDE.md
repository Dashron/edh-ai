# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EDH AI is a TypeScript CLI tool for validating Magic: The Gathering EDH (Elder Dragon Highlander/Commander) deck files. It validates deck files against official EDH format rules using a SQLite database for card data storage and Scryfall integration for comprehensive card information.

## Common Commands

### Development Commands
```bash
# Build the project
npm run build

# Run tests (single run)
npm test

# Run tests in watch mode
npm run test:watch

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

# Import full Scryfall card dataset (with automatic reset)
npm run import-cards <scryfall-json-file>

# Query the SQLite database directly
npm run query-db "<SQL_QUERY>"
```

### Web UI Commands
```bash
# Start the web UI development server
npm run web-dev

# Build the web UI for production
npm run web-build

# Start the web UI production server
npm run web-start
```

### Data Management Workflow
```bash
# Complete setup workflow:
npm run download-cards        # Download latest Scryfall data (~2.3GB)
npm run import-cards data/all-cards.json  # Import with memory optimization
npm run edh-validate ./decks/minthara.txt  # Validate a deck
```

## Architecture

### Core Components

- **`edhValidator.ts`** - Main validation engine with rule-based architecture containing EDH rules and validation logic
- **`database.ts`** - SQLite database interface with Promise wrappers and optimized card storage  
- **`edhCli.ts`** - CLI entry point with argument parsing and user-friendly output
- **`types.ts`** - TypeScript interfaces for cards, validation rules, and results
- **`importCards.ts`** - Streaming JSON parser for importing large Scryfall datasets with memory optimization
- **`addDeckCards.ts`** - Quick deck-based database population utility
- **`queryDb.ts`** - CLI tool for executing raw SQL queries against the card database

### Validation System

The validator uses a rule-based architecture where each EDH rule is implemented as an async validation function:

1. **Deck Size Rule** (`deck_size`) - Ensures exactly 100 cards
2. **Singleton Rule** (`singleton`) - Enforces 1-copy limit (except basic lands and special cases like Relentless Rats)
3. **Commander Check** (`commander_check`) - Verifies presence of valid legendary creature/planeswalker
4. **Format Legality** (`format_legality`) - Checks against Commander ban list

### Database Schema

SQLite database (`data/cards.db`) stores card information with indexes for performance:
- **cards** table with name (primary key), type_line, colors, color_identity, rarity, legalities (JSON), mana_cost, cmc
- Indexes on type_line, legalities, and rarity for fast lookups
- Case-insensitive name matching for card lookups

### Data Flow

1. **Deck Parsing** - Deck file is parsed into card names and quantities (supports comments, quantity prefixes)
2. **Database Lookup** - Card data is retrieved from SQLite database with async operations
3. **Rule Validation** - All validation rules are executed in parallel against the deck
4. **Result Formatting** - Results are formatted with commander analysis and detailed violation reporting

## Web UI

The project includes a Next.js-based web interface for interactive database querying.

### Web UI Features
- **SQL Query Editor** - CodeMirror-powered editor with SQL syntax highlighting
- **Preset Queries** - Pre-built queries for common searches (commanders, banned cards, etc.)
- **Interactive Results** - Tabular display with responsive design
- **Real-time Execution** - Immediate query execution with loading states
- **Error Handling** - User-friendly error messages for invalid queries

### Web UI Architecture
- **Next.js 14+** with TypeScript and App Router
- **API Routes** - Secure database access via `/api/query` endpoint
- **React Components** - Modern hooks-based UI with Tailwind CSS
- **Security** - Read-only database access, SELECT-only query validation
- **Database Integration** - Reuses existing SQLite database and connection logic

### Starting the Web UI
```bash
# Development mode (with hot reload, runs in background)
npm run web-dev  # Runs on http://localhost:3000

# Check web server logs for debugging
tail -f logs/web-dev.log

# Production build and start
npm run web-build
npm run web-start
```

## Testing

### Framework
- **Vitest** - Modern test runner with ES module support
- **Mocking** - Database operations are mocked for unit tests
- **Fixtures** - Sample deck files in `src/__tests__/fixtures/edh-decks/`

### Test Commands
```bash
# Run all tests once
npm test

# Run tests in watch mode  
npm run test:watch

# Run specific test file
npx vitest run src/__tests__/edhValidator.test.ts

# Run tests with coverage
npx vitest run --coverage
```

### Test Structure
- Unit tests for each validation rule with edge cases
- Integration tests for complete validation pipeline
- Mock database implementations for consistent testing
- Test fixtures with valid/invalid EDH deck examples

## Memory Optimization

### Import Process
- **Streaming JSON Parser** - Uses `stream-json` with `StreamArray` for individual card processing
- **Memory Management** - 8GB Node.js heap limit with periodic garbage collection
- **Progress Logging** - Real-time progress with memory usage reporting during imports
- **Database Optimization** - Batch transactions for efficient SQLite operations

### Performance Features
- Automatic database reset before imports to ensure clean state
- Early filtering of non-playable cards (tokens, art cards) during import
- Efficient card lookups with SQLite indexes
- Memory-conscious streaming for large Scryfall datasets

## Development Notes

### Technology Stack
- **Node.js 18+** with ES modules
- **TypeScript** with strict compilation and ES2022 target
- **SQLite3** with custom Promise wrappers for async operations
- **Scryfall API** integration for comprehensive MTG card data
- **Stream-JSON** for memory-efficient parsing of large datasets

### Key Patterns
- All validation rules are async to support database lookups
- Error handling with detailed user-friendly messages
- Streaming architecture for processing large datasets
- Promise-based database operations with proper connection management
- Comprehensive logging with emoji indicators for user experience

### File Structure
- `src/` - TypeScript source code with clear separation of concerns
- `src/__tests__/` - Comprehensive test suite with fixtures
- `web/` - Next.js React web UI for database querying
- `data/` - SQLite database and downloaded Scryfall data (gitignored)
- `decks/` - Sample deck files (gitignored)
- `logs/` - Web server and application logs
- `dist/` - Compiled JavaScript output

## Common Development Tasks

### Adding New Validation Rules
1. Define rule interface in `EDH_RULES` array in `edhValidator.ts`
2. Implement async `check` function with database parameter
3. Add comprehensive tests in `__tests__/edhValidator.test.ts`
4. Update documentation with new rule description

### Database Schema Changes
1. Update schema in `database.ts` `initializeSchema` method
2. Update `EdHCard` interface in `types.ts`
3. Run `npm run reset-db` to clear existing data
4. Re-import data with `npm run import-cards`
5. Update tests to match new schema

### Adding New CLI Commands
1. Add script to `package.json`
2. Create new source file if needed
3. Update CLAUDE.md and README.md documentation
4. Add tests for new functionality