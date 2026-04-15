'use client';

import { ShoppingCart, Users } from 'lucide-react';

type POSMode = 'simple' | 'table';

interface POSModeSelectorProps {
  mode: POSMode;
  onModeChange: (mode: POSMode) => void;
}

export function POSModeSelector({ mode, onModeChange }: POSModeSelectorProps) {
  return (
    <div className="flex gap-1">
      <button
        onClick={() => onModeChange('simple')}
        className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-1 text-sm transition ${
          mode === 'simple'
            ? 'bg-green-600 text-white'
            : 'bg-gray-700 text-muted-foreground hover:bg-gray-600'
        }`}
      >
        <ShoppingCart className="w-5 h-5" /> Para Llevar
      </button>
      <button
        onClick={() => onModeChange('table')}
        className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-1 text-sm transition ${
          mode === 'table'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-muted-foreground hover:bg-gray-600'
        }`}
      >
        <Users className="w-5 h-5" /> Mesa
      </button>
    </div>
  );
}
