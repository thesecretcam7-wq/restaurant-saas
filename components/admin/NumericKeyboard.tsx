'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Delete, X } from 'lucide-react';

interface NumericKeyboardProps {
  isOpen: boolean;
  title: string;
  onConfirm: (value: number) => void;
  onCancel: () => void;
  initialValue?: number;
  allowDecimal?: boolean;
  maxLength?: number;
}

export function NumericKeyboard({
  isOpen,
  title,
  onConfirm,
  onCancel,
  initialValue = 0,
  allowDecimal = true,
  maxLength = 10,
}: NumericKeyboardProps) {
  const [input, setInput] = useState<string>(initialValue.toString());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setInput(initialValue > 0 ? initialValue.toString() : '0');
  }, [initialValue, isOpen]);

  const handleNumberClick = (num: string) => {
    setInput((prev) => {
      if (prev.length >= maxLength) return prev;
      return prev === '0' ? num : prev + num;
    });
  };

  const handleDecimalClick = () => {
    setInput((prev) => {
      if (prev.includes('.') || prev.length >= maxLength) return prev;
      return `${prev}.`;
    });
  };

  const handleBackspace = () => {
    setInput((prev) => {
      const newVal = prev.slice(0, -1);
      return newVal || '0';
    });
  };

  const handleClear = () => {
    setInput('0');
  };

  const handleConfirm = () => {
    const value = parseFloat(input) || 0;
    onConfirm(value);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
        return;
      }

      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        handleNumberClick(e.key);
        return;
      }

      if (allowDecimal && e.key === '.') {
        e.preventDefault();
        handleDecimalClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, allowDecimal, onCancel]);

  if (!isOpen || !mounted) return null;

  const numberButtonClass =
    'rounded-2xl border border-[#f6b92f]/22 bg-white/[0.075] py-5 text-4xl font-black tabular-nums text-[#fff7df] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_22px_rgba(0,0,0,0.18)] transition hover:border-[#f6b92f]/55 hover:bg-[#f6b92f]/12 active:scale-95';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/10 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-[1.75rem] border border-[#f6b92f]/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035)),#10100f] text-[#fff7df] shadow-[0_28px_90px_rgba(0,0,0,0.72),0_0_44px_rgba(246,185,47,0.13)]">
        <div className="flex items-center justify-between border-b border-[#f6b92f]/15 bg-[#10100f]/95 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6b92f]">Cantidad</p>
            <h2 className="mt-1 text-2xl font-black text-[#fff7df]">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-[#f8f5ec]/70 transition hover:border-[#f6b92f]/50 hover:text-[#fff7df]"
            aria-label="Cerrar"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="border-b border-[#f6b92f]/15 bg-[#161410] px-6 py-5">
          <div className="mb-2 text-center text-xs font-black uppercase tracking-[0.18em] text-[#f6b92f]">
            Valor
          </div>
          <div className="w-full overflow-hidden rounded-2xl border border-[#f6b92f]/45 bg-[#242016] p-5 text-center text-6xl font-black tabular-nums text-[#ffd66b] shadow-[inset_0_1px_12px_rgba(0,0,0,0.38)]">
            {input || '0'}
          </div>
        </div>

        <div className="space-y-3 bg-[#10100f] p-6">
          <div className="grid grid-cols-3 gap-3">
            {['7', '8', '9'].map((num) => (
              <button key={num} type="button" onClick={() => handleNumberClick(num)} className={numberButtonClass}>
                {num}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {['4', '5', '6'].map((num) => (
              <button key={num} type="button" onClick={() => handleNumberClick(num)} className={numberButtonClass}>
                {num}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3'].map((num) => (
              <button key={num} type="button" onClick={() => handleNumberClick(num)} className={numberButtonClass}>
                {num}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button type="button" onClick={() => handleNumberClick('0')} className={numberButtonClass}>
              0
            </button>
            {allowDecimal ? (
              <button type="button" onClick={handleDecimalClick} className={numberButtonClass}>
                .
              </button>
            ) : (
              <div aria-hidden="true" />
            )}
            <button
              type="button"
              onClick={handleBackspace}
              className="flex items-center justify-center rounded-2xl border border-[#ff8f8f]/40 bg-[#ff6b6b]/10 py-5 font-bold text-[#ff8f8f] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_22px_rgba(0,0,0,0.18)] transition hover:border-[#ff8f8f]/75 hover:bg-[#ff6b6b]/18 active:scale-95"
            >
              <Delete className="h-8 w-8" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-[#f6b92f]/15 pt-3">
            <button
              type="button"
              onClick={handleClear}
              className="rounded-2xl border border-[#f6b92f]/25 bg-white/[0.06] py-4 text-lg font-black text-[#fff7df] transition hover:border-[#f6b92f]/55 hover:bg-white/[0.09] active:scale-95"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#c97905] via-[#f6b92f] to-[#ffe08a] py-4 text-lg font-black text-[#11100d] shadow-[0_16px_35px_rgba(246,185,47,0.24)] transition hover:brightness-110 active:scale-95"
            >
              <Check className="h-5 w-5" />
              Confirmar
            </button>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.05] py-4 text-lg font-black text-[#f8f5ec]/82 transition hover:border-white/20 hover:bg-white/[0.08] active:scale-95"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
