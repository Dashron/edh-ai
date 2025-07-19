# EDH AI

A set of tools for working with MTG within claude code

## Features

### Deck Validation

- **Deck Size Validation**: Ensures exactly 100 cards
- **Singleton Rule**: Enforces 1-copy limit (except basic lands)
- **Basic Land Support**: Properly allows multiple basic lands
- **Commander Detection**: Identifies valid legendary creatures/planeswalkers
- **Format Legality**: Checks against Commander ban list
- **SQLite Database**: Efficient card data storage and lookup

## Installation

```bash
npm install
```

## Quick Start

1. **Add cards from your deck to the database:**
   ```bash
   npm run add-deck-cards ./decks/minthara.txt
   ```

2. **Validate your deck:**
   ```bash
   npm run edh-validate ./decks/minthara.txt
   ```

## Commands

### `npm run validate <deck-file>`
Validates an EDH deck file against all format rules.

**Example:**
```bash
npm run validate ./decks/minthara.txt
```

### `npm run add-deck-cards <deck-file>`
Adds all cards from a deck file to the local database with basic card data. Useful for testing without requiring the full Scryfall dataset.

**Example:**
```bash
npm run add-deck-cards ./decks/my-deck.txt
```

### `npm run import-cards <scryfall-json-file>`
Imports card data from a Scryfall JSON file into the local SQLite database.

**Example:**
```bash
npm run import-cards ./data/oracle-cards.json
```

## Deck File Format

Deck files should use the standard MTG deck format:

```
1 Sol Ring
4 Lightning Bolt
12 Plains
11 Swamp
1 Minthara, Merciless Soul
```

- One card per line
- Optional quantity at the start (defaults to 1)
- Card names are case-insensitive
- Comments start with `//` or `#`

## Database Setup

### Option 1: Quick Setup (Recommended)
Use `add-deck-cards` to populate the database with just the cards you need:

```bash
npm run add-deck-cards ./decks/your-deck.txt
npm run edh-validate ./decks/your-deck.txt
```

### Option 2: Full Scryfall Dataset
1. Download a Scryfall dataset (oracle-cards.json recommended, ~200MB)
2. Import it: `npm run import-cards ./data/oracle-cards.json`

## Validation Rules

- **Deck Size**: Exactly 100 cards
- **Singleton**: No more than 1 copy of any card (except basic lands)
- **Basic Lands**: Plains, Island, Swamp, Mountain, Forest allow multiple copies
- **Commander**: Must contain at least one legendary creature or planeswalker
- **Format Legality**: No banned cards in Commander format

## Examples

### Valid Deck
```
✅ EDH Deck Validation Results
Total Cards: 100
Valid: ✅

✅ No violations found. Deck is valid!

=== Commander Analysis ===
Potential Commanders:
  • Minthara, Merciless Soul (WB)
```

### Invalid Deck
```
❌ EDH Deck Validation Results
Total Cards: 101
Valid: ❌

Violations Found:
❌ [Deck Size] Deck must contain exactly 100 cards. Found 101 cards.
❌ [Singleton Rule] Found 2 copies of "sol ring". Only 1 copy allowed.
```

## Project Structure

```
edh-validator/
├── src/
│   ├── edhCli.ts          # Main CLI entry point
│   ├── edhValidator.ts    # Core validation logic
│   ├── database.ts        # SQLite database interface
│   ├── importCards.ts     # Scryfall data import
│   ├── addDeckCards.ts    # Quick deck-based setup
│   └── types.ts           # TypeScript interfaces
├── decks/                 # Sample deck files
├── data/                  # Database storage
└── test-cards.json        # Minimal test dataset
```

## Development

```bash
# Build the project
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Clean build artifacts
npm run clean
```

## License

MIT