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
            ? 'bg-[#D35A37] text-white border border-[#D35A37]/45'
            : 'bg-[#1A1F2C]/78 text-[#8b97a8] border border-[#D4AF37]/14 hover:border-[#D4AF37]/32 hover:text-white'
        }`}
      >
        <ShoppingCart className="w-5 h-5" /> Para Llevar
      </button>
      <button
        onClick={() => onModeChange('table')}
        className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-1 text-sm transition ${
          mode === 'table'
            ? 'bg-[#D35A37] text-white border border-[#D35A37]/45'
            : 'bg-[#1A1F2C]/78 text-[#8b97a8] border border-[#D4AF37]/14 hover:border-[#D4AF37]/32 hover:text-white'
        }`}
      >
        <Users className="w-5 h-5" /> En Mesa
      </button>
    </div>
  );
}
