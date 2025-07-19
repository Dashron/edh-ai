#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { runEdHValidation } from './edhValidator.js';

function showUsage(): void {
    console.log(`
Usage: npm run edh-validate <path-to-deck-file>

Validates an EDH/Commander deck file against official format rules.

Expected file format:
- One card per line or quantity followed by card name
- Examples:
  1 Sol Ring
  4 Lightning Bolt
  Forest
  
Arguments:
  <path-to-deck-file>    Path to text file containing the deck list

Rules checked:
- Exactly 100 cards
- Singleton format (max 1 copy except basic lands)
- Commander presence (basic check)

Examples:
  npm run edh-validate ./my-deck.txt
  npm run edh-validate /path/to/commander-deck.txt
`);
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        showUsage();
        process.exit(0);
    }
    
    const filePath = args[0];
    
    if (!filePath) {
        console.error('❌ Error: Please provide a path to a deck file.');
        showUsage();
        process.exit(1);
    }
    
    // Resolve the file path
    const resolvedPath = path.resolve(filePath);
    
    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
        console.error(`❌ Error: File not found: ${resolvedPath}`);
        process.exit(1);
    }
    
    // Check if it's a file (not a directory)
    const stats = fs.statSync(resolvedPath);
    if (!stats.isFile()) {
        console.error(`❌ Error: Path is not a file: ${resolvedPath}`);
        process.exit(1);
    }
    
    try {
        // Read the deck file
        console.log(`📖 Reading deck from: ${resolvedPath}`);
        const deckContent = fs.readFileSync(resolvedPath, 'utf8');
        
        if (deckContent.trim().length === 0) {
            console.error('❌ Error: Deck file is empty.');
            process.exit(1);
        }
        
        // Validate the deck
        await runEdHValidation(deckContent);
        
    } catch (error) {
        console.error(`❌ Error reading file: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}

// Run the CLI if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
}