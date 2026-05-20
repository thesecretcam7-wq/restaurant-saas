'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DollarSign, Users } from 'lucide-react';

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
  onBillTable?: (tableNumber: number) => void;
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

export function TableMap({ tenantId, occupiedTableNumbers, selectedTableNumber, onSelectTable, onBillTable }: TableMapProps) {
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
        {[
          { label: 'Libre', color: '#22c55e', text: 'text-emerald-300' },
          { label: 'Ocupada', color: '#ef4444', text: 'text-red-300' },
          { label: 'Reservada', color: '#f97316', text: 'text-orange-300' },
        ].map(({ label, color, text }) => (
          <div key={label} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.45)]" style={{ backgroundColor: color }} />
            <span className={text}>{label}</span>
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
            <div
              key={table.id}
              className={`
                relative flex flex-col items-center justify-center
                min-h-[116px] rounded-xl border-2 py-3 px-2 transition-all duration-150 active:scale-95
                ${STATUS_STYLES[effectiveStatus]}
                ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-900 scale-105' : ''}
              `}
            >
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => !isDisabled && onSelectTable(table.id, table.table_number)}
                className="flex w-full flex-1 flex-col items-center justify-center disabled:cursor-not-allowed"
              >
                <span className="font-black text-lg leading-none">{table.table_number}</span>
                <div className="flex items-center gap-0.5 mt-1">
                  <Users className="w-2.5 h-2.5 opacity-60" />
                  <span className="text-xs opacity-70">{table.seats}</span>
                </div>
                <span className="text-xs opacity-60 mt-0.5">{STATUS_LABEL[effectiveStatus]}</span>
              </button>
              {hasOrders && (
                <>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-gray-900 animate-pulse" />
                  {onBillTable && (
                    <button
                      type="button"
                      onClick={() => onBillTable(table.table_number)}
                      className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-emerald-300/35 bg-emerald-500/20 px-2 py-1.5 text-[11px] font-black text-emerald-100 transition hover:bg-emerald-500/30"
                    >
                      <DollarSign className="h-3 w-3" />
                      Pagar completa
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
