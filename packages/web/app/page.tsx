'use client';

import { useState, useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';

interface QueryResult {
  success: boolean;
  data?: any[];
  rowCount?: number;
  error?: string;
}

// Mana symbol component using Mana font
const ManaSymbol = ({ symbol }: { symbol: string }) => {
  const getManaClass = (sym: string) => {
    const upper = sym.toUpperCase();
    
    // Handle specific mana symbols
    switch (upper) {
      case 'W': return 'ms ms-w ms-cost';
      case 'U': return 'ms ms-u ms-cost';
      case 'B': return 'ms ms-b ms-cost';
      case 'R': return 'ms ms-r ms-cost';
      case 'G': return 'ms ms-g ms-cost';
      case 'C': return 'ms ms-c ms-cost';
      case 'X': return 'ms ms-x ms-cost';
      case 'Y': return 'ms ms-y ms-cost';
      case 'Z': return 'ms ms-z ms-cost';
      // Handle hybrid mana
      case 'W/U': case 'WU': return 'ms ms-wu ms-cost';
      case 'W/B': case 'WB': return 'ms ms-wb ms-cost';
      case 'U/B': case 'UB': return 'ms ms-ub ms-cost';
      case 'U/R': case 'UR': return 'ms ms-ur ms-cost';
      case 'B/R': case 'BR': return 'ms ms-br ms-cost';
      case 'B/G': case 'BG': return 'ms ms-bg ms-cost';
      case 'R/G': case 'RG': return 'ms ms-rg ms-cost';
      case 'R/W': case 'RW': return 'ms ms-rw ms-cost';
      case 'G/W': case 'GW': return 'ms ms-gw ms-cost';
      case 'G/U': case 'GU': return 'ms ms-gu ms-cost';
      // Handle Phyrexian mana
      case 'W/P': case 'WP': return 'ms ms-wp ms-cost';
      case 'U/P': case 'UP': return 'ms ms-up ms-cost';
      case 'B/P': case 'BP': return 'ms ms-bp ms-cost';
      case 'R/P': case 'RP': return 'ms ms-rp ms-cost';
      case 'G/P': case 'GP': return 'ms ms-gp ms-cost';
      // Handle generic mana
      case '0': return 'ms ms-0 ms-cost';
      case '1': return 'ms ms-1 ms-cost';
      case '2': return 'ms ms-2 ms-cost';
      case '3': return 'ms ms-3 ms-cost';
      case '4': return 'ms ms-4 ms-cost';
      case '5': return 'ms ms-5 ms-cost';
      case '6': return 'ms ms-6 ms-cost';
      case '7': return 'ms ms-7 ms-cost';
      case '8': return 'ms ms-8 ms-cost';
      case '9': return 'ms ms-9 ms-cost';
      case '10': return 'ms ms-10 ms-cost';
      case '11': return 'ms ms-11 ms-cost';
      case '12': return 'ms ms-12 ms-cost';
      case '13': return 'ms ms-13 ms-cost';
      case '14': return 'ms ms-14 ms-cost';
      case '15': return 'ms ms-15 ms-cost';
      case '16': return 'ms ms-16 ms-cost';
      case '17': return 'ms ms-17 ms-cost';
      case '18': return 'ms ms-18 ms-cost';
      case '19': return 'ms ms-19 ms-cost';
      case '20': return 'ms ms-20 ms-cost';
      // Handle 2/color hybrid
      case '2/W': return 'ms ms-2w ms-cost';
      case '2/U': return 'ms ms-2u ms-cost';
      case '2/B': return 'ms ms-2b ms-cost';
      case '2/R': return 'ms ms-2r ms-cost';
      case '2/G': return 'ms ms-2g ms-cost';
      // Handle tap symbol
      case 'T': return 'ms ms-tap ms-cost';
      // Handle energy
      case 'E': return 'ms ms-e ms-cost';
      default:
        // For unknown symbols, try numeric
        if (/^\d+$/.test(sym)) {
          return `ms ms-${sym} ms-cost`;
        }
        // Fallback to generic colorless
        return 'ms ms-c ms-cost';
    }
  };

  return (
    <i 
      className={`${getManaClass(symbol)} inline-block text-base mx-0.5`}
      title={symbol}
    />
  );
};

// Parse mana cost string and render mana symbols
const ManaDisplay = ({ manaString }: { manaString: string }) => {
  if (!manaString) return <span className="text-gray-500">—</span>;
  
  // Parse mana cost like "{2}{W}{U}" or color identity like "[\"W\",\"U\"]"
  let symbols: string[] = [];
  
  if (manaString.startsWith('[') && manaString.endsWith(']')) {
    // Color identity format: ["W","U"]
    try {
      symbols = JSON.parse(manaString);
    } catch {
      symbols = [];
    }
  } else if (manaString.includes('{')) {
    // Mana cost format: {2}{W}{U}
    symbols = manaString.match(/\{([^}]+)\}/g)?.map(match => match.slice(1, -1)) || [];
  } else {
    // Simple format: "WU"
    symbols = manaString.split('');
  }
  
  if (symbols.length === 0) {
    return <span className="text-gray-500">—</span>;
  }
  
  return (
    <div className="flex items-center flex-wrap">
      {symbols.map((symbol, index) => (
        <ManaSymbol key={index} symbol={symbol} />
      ))}
    </div>
  );
};

// Card image tooltip component
const CardTooltip = ({ cardName, x, y }: { cardName: string; x: number; y: number }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [cardFaces, setCardFaces] = useState<Array<{name: string; image_uris?: any}> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchCardImage = async () => {
      try {
        setIsLoading(true);
        setError(false);
        
        // Query our local database for the card's image_uris and card_faces
        const response = await fetch('/api/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            query: `SELECT image_uris, card_faces FROM cards WHERE name = '${cardName.replace(/'/g, "''")}'` 
          }),
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data && result.data.length > 0) {
            const { image_uris, card_faces } = result.data[0];
            
            // Check if this is a dual-faced card
            if (card_faces) {
              try {
                const parsedCardFaces = typeof card_faces === 'string' ? JSON.parse(card_faces) : card_faces;
                if (parsedCardFaces && parsedCardFaces.length >= 2) {
                  setCardFaces(parsedCardFaces);
                  setImageUrl(null);
                  return;
                }
              } catch {
                // Fall back to single image
              }
            }
            
            // Single-faced card or fallback
            if (image_uris) {
              let parsedImageUris;
              try {
                parsedImageUris = typeof image_uris === 'string' ? JSON.parse(image_uris) : image_uris;
                setImageUrl(parsedImageUris.normal || parsedImageUris.large || parsedImageUris.small);
                setCardFaces(null);
              } catch {
                setError(true);
              }
            } else {
              setError(true);
            }
          } else {
            setError(true);
          }
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (cardName) {
      fetchCardImage();
    }
  }, [cardName]);

  if (!cardName) return null;

  return (
    <div 
      className="fixed z-50 pointer-events-none"
      style={{ 
        left: x + 10, 
        top: y - 150,
        transform: y < 200 ? 'translateY(0)' : 'translateY(-100%)'
      }}
    >
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-2 shadow-xl">
        {isLoading && (
          <div className="w-64 h-40 bg-gray-700 rounded flex items-center justify-center">
            <span className="text-gray-400 text-sm">Loading...</span>
          </div>
        )}
        
        {error && (
          <div className="w-64 h-40 bg-gray-700 rounded flex items-center justify-center">
            <span className="text-gray-400 text-sm">Image not found</span>
          </div>
        )}
        
        {/* Dual-faced card display */}
        {cardFaces && cardFaces.length >= 2 && !isLoading && !error && (
          <div className="flex gap-4">
            {cardFaces.slice(0, 2).map((face, index) => {
              const faceImageUrl = face.image_uris?.normal || face.image_uris?.large || face.image_uris?.small;
              return (
                <div key={index} className="flex flex-col items-center">
                  {faceImageUrl ? (
                    <img 
                      src={faceImageUrl} 
                      alt={face.name}
                      className="max-w-64 h-auto rounded"
                      onError={() => setError(true)}
                    />
                  ) : (
                    <div className="w-64 h-40 bg-gray-700 rounded flex items-center justify-center">
                      <span className="text-gray-400 text-sm">No image</span>
                    </div>
                  )}
                  <div className="mt-1 text-xs text-gray-300 text-center font-medium max-w-64 truncate">
                    {face.name}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Single-faced card display */}
        {imageUrl && !cardFaces && !isLoading && !error && (
          <img 
            src={imageUrl} 
            alt={cardName}
            className="max-w-64 h-auto rounded"
            onError={() => setError(true)}
          />
        )}
        
        <div className="mt-2 text-xs text-gray-300 text-center font-medium">
          {cardName}
        </div>
      </div>
    </div>
  );
};

const PRESET_QUERIES = [
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

export default function DatabaseQueryUI() {
  const [query, setQuery] = useState(PRESET_QUERIES[0].query);
  const [results, setResults] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<{ name: string; x: number; y: number } | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const executeQuery = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      
      const result = await response.json();
      setResults(result);
    } catch (error) {
      setResults({
        success: false,
        error: error instanceof Error ? error.message : 'Request failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPresetQuery = (presetQuery: string) => {
    setQuery(presetQuery);
    setResults(null);
  };

  const handleCardHover = (cardName: string, event: React.MouseEvent) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredCard({
      name: cardName,
      x: event.clientX,
      y: event.clientY
    });
  };

  const handleCardLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setHoveredCard(null);
    }, 100); // Small delay to prevent flickering
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">
          EDH AI - Card Database Query Tool
        </h1>
        
        {/* Preset Queries */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-200">Preset Queries</h2>
          <div className="flex flex-wrap gap-2">
            {PRESET_QUERIES.map((preset) => (
              <button
                key={preset.name}
                onClick={() => loadPresetQuery(preset.query)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Query Editor */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-200">SQL Query</h2>
          <div className="border border-gray-600 rounded-lg overflow-hidden">
            <CodeMirror
              value={query}
              onChange={(value) => setQuery(value)}
              extensions={[sql()]}
              theme={oneDark}
              placeholder="Enter your SQL query here..."
              className="text-sm"
            />
          </div>
          <button
            onClick={executeQuery}
            disabled={isLoading || !query.trim()}
            className="mt-3 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-600 transition-colors"
          >
            {isLoading ? 'Executing...' : 'Execute Query'}
          </button>
        </div>

        {/* Results */}
        {results && (
          <div className="bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-200">Results</h2>
            
            {results.success ? (
              <div>
                <p className="text-sm text-gray-400 mb-4">
                  Found {results.rowCount} row(s)
                </p>
                
                {results.data && results.data.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-600">
                      <thead className="bg-gray-700">
                        <tr>
                          {Object.keys(results.data[0]).map((column) => (
                            <th
                              key={column}
                              className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider border-b border-gray-600"
                            >
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-600">
                        {results.data.map((row, index) => (
                          <tr key={index} className="hover:bg-gray-700">
                            {Object.entries(row).map(([column, value]) => {
                              const isManaCost = column.toLowerCase().includes('mana_cost');
                              const isColorIdentity = column.toLowerCase().includes('color_identity');
                              const isCardName = column.toLowerCase() === 'name';
                              
                              return (
                                <td
                                  key={column}
                                  className="px-4 py-2 text-sm text-gray-200 border-b border-gray-600"
                                >
                                  {isManaCost || isColorIdentity ? (
                                    <ManaDisplay manaString={String(value || '')} />
                                  ) : isCardName ? (
                                    <span
                                      className="cursor-pointer hover:text-blue-400 hover:underline"
                                      onMouseEnter={(e) => handleCardHover(String(value), e)}
                                      onMouseLeave={handleCardLeave}
                                    >
                                      {String(value || '')}
                                    </span>
                                  ) : (
                                    typeof value === 'object' 
                                      ? JSON.stringify(value) 
                                      : String(value || '')
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-400">No results found.</p>
                )}
              </div>
            ) : (
              <div className="text-red-400">
                <p className="font-semibold">Error:</p>
                <p>{results.error}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Card Image Tooltip */}
        {hoveredCard && (
          <CardTooltip 
            cardName={hoveredCard.name}
            x={hoveredCard.x}
            y={hoveredCard.y}
          />
        )}
      </div>
    </div>
  );
}
