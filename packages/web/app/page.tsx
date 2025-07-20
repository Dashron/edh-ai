'use client';

import { useState, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { ManaDisplay } from '../components/ManaDisplay';
import { CardTooltip } from '../components/CardTooltip';
import { QueryBuilder } from '../components/QueryBuilder';
import { PRESET_QUERIES } from '../constants/queries';

interface QueryResult {
  success: boolean;
  data?: Record<string, unknown>[];
  rowCount?: number;
  error?: string;
}

export default function DatabaseQueryUI() {
  const [query, setQuery] = useState(PRESET_QUERIES[0].query);
  const [results, setResults] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<{ name: string; x: number; y: number } | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Query Builder State
  const [useQueryBuilder, setUseQueryBuilder] = useState(false);

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

        {/* Query Builder Toggle */}
        <div className="mb-6">
          <button
onClick={() => setUseQueryBuilder(!useQueryBuilder)}
            className={`px-4 py-2 rounded transition-colors ${
              useQueryBuilder 
                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            {useQueryBuilder ? 'Switch to SQL Editor' : 'Use Query Builder'}
          </button>
        </div>

        {/* Query Builder */}
        {useQueryBuilder && (
          <div className="mb-6">
            <QueryBuilder onQueryGenerated={setQuery} />
          </div>
        )}

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
