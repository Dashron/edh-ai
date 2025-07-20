'use client';

import { useState } from 'react';
import { QueryCondition, QUERY_FIELDS, OPERATORS, COLOR_OPTIONS } from '../constants/queries';

interface QueryBuilderProps {
  onQueryGenerated: (query: string) => void;
}

export const QueryBuilder = ({ onQueryGenerated }: QueryBuilderProps) => {
  const [conditions, setConditions] = useState<QueryCondition[]>([
    { id: '1', field: 'name', operator: 'LIKE', value: '', logicalOperator: 'AND' }
  ]);
  const [selectedFields, setSelectedFields] = useState(['name', 'type_line', 'mana_cost', 'cmc']);
  const [orderBy, setOrderBy] = useState('name');
  const [limit, setLimit] = useState(50);

  // Query generation logic
  const generateQuery = () => {
    if (conditions.length === 0 || !conditions.some(c => c.value.trim())) {
      return `SELECT ${selectedFields.join(', ')} FROM cards ORDER BY ${orderBy} LIMIT ${limit};`;
    }

    const whereConditions = conditions
      .filter(c => c.value.trim())
      .map((condition, index) => {
        const field = QUERY_FIELDS.find(f => f.value === condition.field);
        let sqlCondition = '';
        
        if (field?.type === 'colors') {
          if (condition.operator === 'CONTAINS') {
            sqlCondition = `${condition.field} LIKE '%${condition.value}%'`;
          } else if (condition.operator === 'EXACT') {
            const colors = condition.value.split(',').map(c => c.trim()).filter(c => c);
            sqlCondition = colors.map(color => `${condition.field} LIKE '%${color}%'`).join(' AND ');
          } else if (condition.operator === 'NOT_CONTAINS') {
            sqlCondition = `${condition.field} NOT LIKE '%${condition.value}%'`;
          }
        } else if (field?.type === 'legality') {
          sqlCondition = `json_extract(legalities, '$.commander') = '${condition.operator}'`;
        } else if (condition.operator === 'LIKE' || condition.operator === 'NOT LIKE') {
          sqlCondition = `${condition.field} ${condition.operator} '%${condition.value}%'`;
        } else {
          const value = field?.type === 'number' ? condition.value : `'${condition.value}'`;
          sqlCondition = `${condition.field} ${condition.operator} ${value}`;
        }
        
        if (index === 0) return sqlCondition;
        return `${condition.logicalOperator} ${sqlCondition}`;
      })
      .join(' ');

    return `SELECT ${selectedFields.join(', ')} FROM cards WHERE ${whereConditions} ORDER BY ${orderBy} LIMIT ${limit};`;
  };

  // Helper functions for query builder
  const addCondition = () => {
    const newCondition: QueryCondition = {
      id: Date.now().toString(),
      field: 'name',
      operator: 'LIKE',
      value: '',
      logicalOperator: 'AND'
    };
    setConditions([...conditions, newCondition]);
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  const updateCondition = (id: string, updates: Partial<QueryCondition>) => {
    setConditions(conditions.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const toggleField = (field: string) => {
    if (selectedFields.includes(field)) {
      setSelectedFields(selectedFields.filter(f => f !== field));
    } else {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const handleGenerateQuery = () => {
    const query = generateQuery();
    onQueryGenerated(query);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4 text-gray-200">Query Builder</h2>
      
      {/* Select Fields */}
      <div className="mb-4">
        <h3 className="text-md font-medium mb-2 text-gray-300">Select Fields to Display:</h3>
        <div className="flex flex-wrap gap-2">
          {QUERY_FIELDS.map((field) => (
            <label key={field.value} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedFields.includes(field.value)}
                onChange={() => toggleField(field.value)}
                className="rounded text-blue-600"
              />
              <span className="text-gray-300 text-sm">{field.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Conditions */}
      <div className="mb-4">
        <h3 className="text-md font-medium mb-2 text-gray-300">Conditions:</h3>
        {conditions.map((condition, index) => {
          const field = QUERY_FIELDS.find(f => f.value === condition.field);
          const operators = field ? OPERATORS[field.type as keyof typeof OPERATORS] : OPERATORS.text;
          
          return (
            <div key={condition.id} className="flex items-center gap-2 mb-2 p-3 bg-gray-700 rounded">
              {/* Logical Operator */}
              {index > 0 && (
                <select
                  value={condition.logicalOperator}
                  onChange={(e) => updateCondition(condition.id, { logicalOperator: e.target.value as 'AND' | 'OR' })}
                  className="bg-gray-600 text-white rounded px-2 py-1 text-sm"
                >
                  <option value="AND">AND</option>
                  <option value="OR">OR</option>
                </select>
              )}
              
              {/* Field */}
              <select
                value={condition.field}
                onChange={(e) => {
                  const newField = QUERY_FIELDS.find(f => f.value === e.target.value);
                  const newOperators = newField ? OPERATORS[newField.type as keyof typeof OPERATORS] : OPERATORS.text;
                  updateCondition(condition.id, { 
                    field: e.target.value, 
                    operator: newOperators[0].value 
                  });
                }}
                className="bg-gray-600 text-white rounded px-2 py-1 text-sm min-w-32"
              >
                {QUERY_FIELDS.map((field) => (
                  <option key={field.value} value={field.value}>{field.label}</option>
                ))}
              </select>
              
              {/* Operator */}
              <select
                value={condition.operator}
                onChange={(e) => updateCondition(condition.id, { operator: e.target.value })}
                className="bg-gray-600 text-white rounded px-2 py-1 text-sm min-w-32"
              >
                {operators.map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
              
              {/* Value */}
              {field?.type === 'colors' ? (
                <select
                  value={condition.value}
                  onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                  className="bg-gray-600 text-white rounded px-2 py-1 text-sm min-w-32"
                >
                  <option value="">Select color...</option>
                  {COLOR_OPTIONS.map((color) => (
                    <option key={color.value} value={color.value}>{color.label}</option>
                  ))}
                </select>
              ) : field?.type === 'select' ? (
                <select
                  value={condition.value}
                  onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                  className="bg-gray-600 text-white rounded px-2 py-1 text-sm min-w-32"
                >
                  <option value="">Select...</option>
                  {field.options?.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field?.type === 'number' ? 'number' : 'text'}
                  value={condition.value}
                  onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                  placeholder="Enter value..."
                  className="bg-gray-600 text-white rounded px-2 py-1 text-sm min-w-32"
                />
              )}
              
              {/* Remove Button */}
              <button
                onClick={() => removeCondition(condition.id)}
                className="bg-red-600 text-white rounded px-2 py-1 text-sm hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          );
        })}
        
        <button
          onClick={addCondition}
          className="bg-green-600 text-white rounded px-3 py-1 text-sm hover:bg-green-700"
        >
          Add Condition
        </button>
      </div>

      {/* Order By and Limit */}
      <div className="flex gap-4 mb-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">Order By:</label>
          <select
            value={orderBy}
            onChange={(e) => setOrderBy(e.target.value)}
            className="bg-gray-600 text-white rounded px-2 py-1 text-sm"
          >
            {QUERY_FIELDS.map((field) => (
              <option key={field.value} value={field.value}>{field.label}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm text-gray-300 mb-1">Limit:</label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value) || 50)}
            min="1"
            max="1000"
            className="bg-gray-600 text-white rounded px-2 py-1 text-sm w-20"
          />
        </div>
      </div>

      {/* Generate Query Button */}
      <button
        onClick={handleGenerateQuery}
        className="bg-purple-600 text-white rounded px-4 py-2 hover:bg-purple-700"
      >
        Generate SQL Query
      </button>
    </div>
  );
};