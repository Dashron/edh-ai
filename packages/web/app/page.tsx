'use client';

import { useState, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';

interface QueryResult {
  success: boolean;
  data?: any[];
  rowCount?: number;
  error?: string;
}

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
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check if user prefers dark mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          EDH AI - Card Database Query Tool
        </h1>
        
        {/* Preset Queries */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Preset Queries</h2>
          <div className="flex flex-wrap gap-2">
            {PRESET_QUERIES.map((preset) => (
              <button
                key={preset.name}
                onClick={() => loadPresetQuery(preset.query)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Query Editor */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">SQL Query</h2>
          <div className={`border rounded-lg overflow-hidden ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
            <CodeMirror
              value={query}
              onChange={(value) => setQuery(value)}
              extensions={[sql()]}
              theme={isDarkMode ? oneDark : 'light'}
              placeholder="Enter your SQL query here..."
              className="text-sm"
            />
          </div>
          <button
            onClick={executeQuery}
            disabled={isLoading || !query.trim()}
            className="mt-3 px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 transition-colors"
          >
            {isLoading ? 'Executing...' : 'Execute Query'}
          </button>
        </div>

        {/* Results */}
        {results && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Results</h2>
            
            {results.success ? (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Found {results.rowCount} row(s)
                </p>
                
                {results.data && results.data.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(results.data[0]).map((column) => (
                            <th
                              key={column}
                              className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
                            >
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {results.data.map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            {Object.entries(row).map(([column, value]) => (
                              <td
                                key={column}
                                className="px-4 py-2 text-sm text-gray-900 border-b"
                              >
                                {typeof value === 'object' 
                                  ? JSON.stringify(value) 
                                  : String(value || '')
                                }
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-600">No results found.</p>
                )}
              </div>
            ) : (
              <div className="text-red-600">
                <p className="font-semibold">Error:</p>
                <p>{results.error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
