'use client';

import { useEffect, useState } from 'react';
import { X, Delete } from 'lucide-react';

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

  useEffect(() => {
    setInput(initialValue > 0 ? initialValue.toString() : '0');
  }, [initialValue, isOpen]);

  // Handle physical keyboard input
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
        setInput((prev) => prev.slice(0, -1) || '0');
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
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, allowDecimal, onCancel]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white px-6 py-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button
            onClick={onCancel}
            className="hover:bg-white/20 p-2 rounded-lg transition"
            aria-label="Cerrar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Display */}
        <div className="bg-gradient-to-b from-gray-50 to-white px-6 py-6 border-b-2 border-gray-200">
          <div className="text-center mb-2 text-xs text-gray-500 font-semibold uppercase tracking-wide">Cantidad</div>
          <div className="w-full overflow-hidden rounded-2xl border-2 border-blue-300 bg-white p-6 text-center text-6xl font-black tabular-nums text-blue-600 shadow-inner">
            {input || '0'}
          </div>
        </div>

        {/* Keypad */}
        <div className="p-6 space-y-3 bg-gray-50">
          {/* Row 1: 7 8 9 */}
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleNumberClick('7')}
              className="bg-white hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 text-5xl font-black text-gray-800 py-6 rounded-xl active:scale-95 transition shadow-sm"
            >
              7
            </button>
            <button
              type="button"
              onClick={() => handleNumberClick('8')}
              className="bg-white hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 text-5xl font-black text-gray-800 py-6 rounded-xl active:scale-95 transition shadow-sm"
            >
              8
            </button>
            <button
              type="button"
              onClick={() => handleNumberClick('9')}
              className="bg-white hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 text-5xl font-black text-gray-800 py-6 rounded-xl active:scale-95 transition shadow-sm"
            >
              9
            </button>
          </div>

          {/* Row 2: 4 5 6 */}
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleNumberClick('4')}
              className="bg-white hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 text-5xl font-black text-gray-800 py-6 rounded-xl active:scale-95 transition shadow-sm"
            >
              4
            </button>
            <button
              type="button"
              onClick={() => handleNumberClick('5')}
              className="bg-white hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 text-5xl font-black text-gray-800 py-6 rounded-xl active:scale-95 transition shadow-sm"
            >
              5
            </button>
            <button
              type="button"
              onClick={() => handleNumberClick('6')}
              className="bg-white hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 text-5xl font-black text-gray-800 py-6 rounded-xl active:scale-95 transition shadow-sm"
            >
              6
            </button>
          </div>

          {/* Row 3: 1 2 3 */}
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleNumberClick('1')}
              className="bg-white hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 text-5xl font-black text-gray-800 py-6 rounded-xl active:scale-95 transition shadow-sm"
            >
              1
            </button>
            <button
              type="button"
              onClick={() => handleNumberClick('2')}
              className="bg-white hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 text-5xl font-black text-gray-800 py-6 rounded-xl active:scale-95 transition shadow-sm"
            >
              2
            </button>
            <button
              type="button"
              onClick={() => handleNumberClick('3')}
              className="bg-white hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 text-5xl font-black text-gray-800 py-6 rounded-xl active:scale-95 transition shadow-sm"
            >
              3
            </button>
          </div>

          {/* Row 4: 0 . Delete */}
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleNumberClick('0')}
              className="bg-white hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 text-5xl font-black text-gray-800 py-6 rounded-xl active:scale-95 transition shadow-sm"
            >
              0
            </button>
            {allowDecimal && (
              <button
                type="button"
                onClick={handleDecimalClick}
                className="bg-white hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 text-5xl font-black text-gray-800 py-6 rounded-xl active:scale-95 transition shadow-sm"
              >
                .
              </button>
            )}
            <button
              type="button"
              onClick={handleBackspace}
              className="bg-red-50 hover:bg-red-100 border-2 border-red-300 hover:border-red-500 text-red-600 font-bold py-6 rounded-xl active:scale-95 transition shadow-sm flex items-center justify-center"
            >
              <Delete className="w-8 h-8" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t-2 border-gray-200">
            <button
              type="button"
              onClick={handleClear}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg py-4 rounded-xl active:scale-95 transition shadow-md"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="bg-green-600 hover:bg-green-700 text-white font-bold text-lg py-4 rounded-xl active:scale-95 transition shadow-md"
            >
              ✓ Confirmar
            </button>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="w-full bg-gray-400 hover:bg-gray-500 text-white font-bold text-lg py-4 rounded-xl active:scale-95 transition shadow-md"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
