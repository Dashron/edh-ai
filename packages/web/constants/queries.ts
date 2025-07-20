export const PRESET_QUERIES = [
  {
    name: 'All Commanders',
    query: `SELECT name, type_line, color_identity, mana_cost 
FROM cards 
WHERE type_line LIKE '%Legendary%' 
  AND (type_line LIKE '%Creature%' OR type_line LIKE '%Planeswalker%')
ORDER BY name
LIMIT 50;`
  },
  {
    name: 'Banned Cards',
    query: `SELECT name, type_line, legalities 
FROM cards 
WHERE json_extract(legalities, '$.commander') = 'banned'
ORDER BY name;`
  },
  {
    name: 'Blue Cards by CMC',
    query: `SELECT name, mana_cost, cmc, type_line 
FROM cards 
WHERE color_identity LIKE '%U%' 
ORDER BY cmc, name
LIMIT 50;`
  },
  {
    name: 'Artifacts',
    query: `SELECT name, mana_cost, cmc, type_line 
FROM cards 
WHERE type_line LIKE '%Artifact%' 
ORDER BY cmc, name
LIMIT 50;`
  }
];

// Query Builder Types and Data
export interface QueryCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
  logicalOperator?: 'AND' | 'OR';
}

export const QUERY_FIELDS = [
  { value: 'name', label: 'Card Name', type: 'text' },
  { value: 'type_line', label: 'Type Line', type: 'text' },
  { value: 'colors', label: 'Colors', type: 'colors' },
  { value: 'color_identity', label: 'Color Identity', type: 'colors' },
  { value: 'mana_cost', label: 'Mana Cost', type: 'text' },
  { value: 'cmc', label: 'Converted Mana Cost', type: 'number' },
  { value: 'rarity', label: 'Rarity', type: 'select', options: ['common', 'uncommon', 'rare', 'mythic'] },
  { value: 'legalities', label: 'Commander Legal', type: 'legality' }
];

export const OPERATORS = {
  text: [
    { value: 'LIKE', label: 'Contains' },
    { value: '=', label: 'Equals' },
    { value: 'NOT LIKE', label: 'Does not contain' },
    { value: '!=', label: 'Does not equal' }
  ],
  number: [
    { value: '=', label: 'Equals' },
    { value: '>', label: 'Greater than' },
    { value: '>=', label: 'Greater than or equal' },
    { value: '<', label: 'Less than' },
    { value: '<=', label: 'Less than or equal' },
    { value: '!=', label: 'Not equal' }
  ],
  colors: [
    { value: 'CONTAINS', label: 'Contains color' },
    { value: 'EXACT', label: 'Exactly these colors' },
    { value: 'NOT_CONTAINS', label: 'Does not contain' }
  ],
  select: [
    { value: '=', label: 'Equals' },
    { value: '!=', label: 'Does not equal' }
  ],
  legality: [
    { value: 'legal', label: 'Legal' },
    { value: 'banned', label: 'Banned' },
    { value: 'restricted', label: 'Restricted' }
  ]
};

export const COLOR_OPTIONS = [
  { value: 'W', label: 'White' },
  { value: 'U', label: 'Blue' },
  { value: 'B', label: 'Black' },
  { value: 'R', label: 'Red' },
  { value: 'G', label: 'Green' }
];