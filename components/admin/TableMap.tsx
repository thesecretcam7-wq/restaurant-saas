'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users } from 'lucide-react';

interface Table {
  id: string;
  table_number: number;
  seats: number;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
}

interface TableMapProps {
  tenantId: string;
  /** IDs de mesas con pedidos pendientes (para colorear como ocupadas) */
  occupiedTableNumbers: number[];
  /** Número de la mesa seleccionada actualmente en el carrito */
  selectedTableNumber: number | null;
  onSelectTable: (tableId: string, tableNumber: number) => void;
}

const STATUS_STYLES: Record<string, string> = {
  available:    'bg-emerald-900/50 border-emerald-600 text-emerald-300 hover:bg-emerald-800/60',
  occupied:     'bg-red-900/50 border-red-500 text-red-300 hover:bg-red-800/60',
  reserved:     'bg-yellow-900/50 border-yellow-500 text-yellow-300 hover:bg-yellow-800/60',
  maintenance:  'bg-gray-800/50 border-gray-600 text-gray-500 cursor-not-allowed',
};

const STATUS_LABEL: Record<string, string> = {
  available:   'Libre',
  occupied:    'Ocupada',
  reserved:    'Reservada',
  maintenance: 'Mant.',
};

export function TableMap({ tenantId, occupiedTableNumbers, selectedTableNumber, onSelectTable }: TableMapProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase
      .from('tables')
      .select('id, table_number, seats, status')
      .eq('tenant_id', tenantId)
      .order('table_number')
      .then(({ data }) => {
        if (data) setTables(data as Table[]);
        setLoading(false);
      });
  }, [tenantId, supabase]);

  if (loading) {
    return <div className="flex items-center justify-center h-32 text-gray-500 text-sm">Cargando mesas...</div>;
  }

  if (tables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-sm gap-1">
        <p>Sin mesas configuradas</p>
        <p className="text-xs text-gray-600">Agrégalas en Configuración → Mesas</p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-3">
      {/* Leyenda */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[['Libre', 'bg-emerald-500'], ['Ocupada', 'bg-red-500'], ['Reservada', 'bg-yellow-500']].map(([label, color]) => (
          <div key={label} className="flex items-center gap-1">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
            <span className="text-gray-400">{label}</span>
          </div>
        ))}
      </div>

      {/* Grid de mesas */}
      <div className="grid grid-cols-3 gap-2">
        {tables.map(table => {
          const hasOrders = occupiedTableNumbers.includes(table.table_number);
          const effectiveStatus = hasOrders ? 'occupied' : table.status;
          const isSelected = selectedTableNumber === table.table_number;
          const isDisabled = effectiveStatus === 'maintenance';

          return (
            <button
              key={table.id}
              disabled={isDisabled}
              onClick={() => !isDisabled && onSelectTable(table.id, table.table_number)}
              className={`
                relative flex flex-col items-center justify-center
                rounded-xl border-2 py-3 px-2 transition-all duration-150 active:scale-95
                ${STATUS_STYLES[effectiveStatus]}
                ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-900 scale-105' : ''}
              `}
            >
              <span className="font-black text-lg leading-none">{table.table_number}</span>
              <div className="flex items-center gap-0.5 mt-1">
                <Users className="w-2.5 h-2.5 opacity-60" />
                <span className="text-xs opacity-70">{table.seats}</span>
              </div>
              <span className="text-xs opacity-60 mt-0.5">{STATUS_LABEL[effectiveStatus]}</span>
              {hasOrders && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-gray-900 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
