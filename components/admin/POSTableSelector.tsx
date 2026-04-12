'use client';

import { useEffect, useState } from 'react';
import { Grid3x3 } from 'lucide-react';

interface Table {
  id: string;
  table_number: number;
  seats: number;
  status: string;
}

interface POSTableSelectorProps {
  tenantId: string;
  selectedTableId: string | null;
  onTableSelect: (tableId: string, tableNumber: number) => void;
  required?: boolean;
}

export function POSTableSelector({
  tenantId,
  selectedTableId,
  onTableSelect,
  required = false,
}: POSTableSelectorProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(null);

  useEffect(() => {
    fetchAvailableTables();
  }, [tenantId]);

  async function fetchAvailableTables() {
    try {
      const response = await fetch(`/api/tables/available?tenantId=${tenantId}`);
      if (!response.ok) throw new Error('Failed to fetch tables');
      const data = await response.json();
      setTables(data.tables || []);
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleTableSelect = (tableId: string) => {
    const selected = tables.find(t => t.id === tableId);
    if (selected) {
      setSelectedTableNumber(selected.table_number);
      onTableSelect(tableId, selected.table_number);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-2 border border-gray-700">
        <label className="flex items-center gap-1 text-xs font-medium text-gray-300 mb-1">
          <Grid3x3 className="w-3 h-3" />
          {required ? 'Mesa *' : 'Mesa'}
        </label>
        <div className="text-gray-500 text-xs">Cargando mesas...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-2 border border-gray-700">
      <label className="flex items-center gap-1 text-xs font-medium text-gray-300 mb-1">
        <Grid3x3 className="w-3 h-3" />
        {required ? 'Mesa *' : 'Mesa'}
      </label>

      {tables.length === 0 ? (
        <div className="text-gray-500 text-xs">No hay mesas disponibles</div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {tables.map((table) => (
            <button
              key={table.id}
              onClick={() => handleTableSelect(table.id)}
              className={`p-1 rounded font-bold text-xs transition ${
                selectedTableId === table.id
                  ? 'bg-green-600 text-white border-2 border-green-400'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-2 border-transparent'
              }`}
            >
              <div>Mesa {table.table_number}</div>
              <div className="text-xs opacity-75">{table.seats} sillas</div>
            </button>
          ))}
        </div>
      )}

      {selectedTableNumber !== null && (
        <div className="text-xs text-green-400 mt-1">✓ Mesa {selectedTableNumber} seleccionada</div>
      )}
    </div>
  );
}
