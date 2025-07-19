export interface Card {
	name: string;
	colors: Array<string>;
	rarity: string;
	color_identity: Array<string>;
	image_uris?: {
		small?: string;
		normal?: string;
		large?: string;
	};
	prices?: {
		usd?: string | null;
		usd_foil?: string | null;
		usd_etched?: string | null;
		eur?: string | null;
		eur_foil?: string | null;
		eur_etched?: string | null;
		tix?: string | null;
	};
}

// Extended Card interface for EDH validation (adds fields not in the existing Card type)
export interface EdHCard extends Card {
    type_line?: string;
    legalities?: Record<string, string>;
    mana_cost?: string;
    cmc?: number;
}

export interface EdHValidationRule {
    id: string;
    name: string;
    description: string;
    check: (cardCounts: Record<string, number>, cardDb?: import('./database.js').CardDatabase) => Promise<RuleViolation[]>;
}

export interface RuleViolation {
    ruleId: string;
    ruleName: string;
    message: string;
    severity: 'error' | 'warning';
    affectedCards?: string[];
}

export interface EdHValidationResult {
    isValid: boolean;
    totalCards: number;
    violations: RuleViolation[];
    cardCounts: Record<string, number>;
    cardDb?: import('./database.js').CardDatabase;
}