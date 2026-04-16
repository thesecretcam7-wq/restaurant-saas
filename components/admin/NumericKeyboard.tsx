'use client';

import { useEffect, useState } from 'react';
import { X, Backspace } from 'lucide-react';

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
    setInput(initialValue.toString());
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
    if (input.length < maxLength) {
      setInput((prev) => (prev === '0' ? num : prev + num));
    }
  };

  const handleDecimalClick = () => {
    if (!input.includes('.') && input.length < maxLength) {
      setInput((prev) => prev + '.');
    }
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            onClick={onCancel}
            className="hover:bg-blue-800 p-2 rounded-lg transition"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Display */}
        <div className="bg-gray-50 px-6 py-4 border-b">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/[^\d.]/g, '').slice(0, maxLength))}
            className="w-full text-right text-4xl font-bold text-gray-900 bg-white border-2 border-gray-300 rounded-lg p-4 focus:outline-none focus:border-blue-500"
            readOnly={false}
          />
        </div>

        {/* Keypad */}
        <div className="p-4 space-y-3">
          {/* Row 1: 7 8 9 */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleNumberClick('7')}
              className="bg-gray-100 hover:bg-gray-200 text-2xl font-bold py-4 rounded-lg active:scale-95 transition"
            >
              7
            </button>
            <button
              onClick={() => handleNumberClick('8')}
              className="bg-gray-100 hover:bg-gray-200 text-2xl font-bold py-4 rounded-lg active:scale-95 transition"
            >
              8
            </button>
            <button
              onClick={() => handleNumberClick('9')}
              className="bg-gray-100 hover:bg-gray-200 text-2xl font-bold py-4 rounded-lg active:scale-95 transition"
            >
              9
            </button>
          </div>

          {/* Row 2: 4 5 6 */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleNumberClick('4')}
              className="bg-gray-100 hover:bg-gray-200 text-2xl font-bold py-4 rounded-lg active:scale-95 transition"
            >
              4
            </button>
            <button
              onClick={() => handleNumberClick('5')}
              className="bg-gray-100 hover:bg-gray-200 text-2xl font-bold py-4 rounded-lg active:scale-95 transition"
            >
              5
            </button>
            <button
              onClick={() => handleNumberClick('6')}
              className="bg-gray-100 hover:bg-gray-200 text-2xl font-bold py-4 rounded-lg active:scale-95 transition"
            >
              6
            </button>
          </div>

          {/* Row 3: 1 2 3 */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleNumberClick('1')}
              className="bg-gray-100 hover:bg-gray-200 text-2xl font-bold py-4 rounded-lg active:scale-95 transition"
            >
              1
            </button>
            <button
              onClick={() => handleNumberClick('2')}
              className="bg-gray-100 hover:bg-gray-200 text-2xl font-bold py-4 rounded-lg active:scale-95 transition"
            >
              2
            </button>
            <button
              onClick={() => handleNumberClick('3')}
              className="bg-gray-100 hover:bg-gray-200 text-2xl font-bold py-4 rounded-lg active:scale-95 transition"
            >
              3
            </button>
          </div>

          {/* Row 4: 0 . Backspace */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleNumberClick('0')}
              className="bg-gray-100 hover:bg-gray-200 text-2xl font-bold py-4 rounded-lg active:scale-95 transition col-span-1"
            >
              0
            </button>
            {allowDecimal && (
              <button
                onClick={handleDecimalClick}
                className="bg-gray-100 hover:bg-gray-200 text-2xl font-bold py-4 rounded-lg active:scale-95 transition"
              >
                .
              </button>
            )}
            <button
              onClick={handleBackspace}
              className="bg-red-100 hover:bg-red-200 text-red-700 font-bold py-4 rounded-lg active:scale-95 transition flex items-center justify-center"
            >
              <Backspace className="w-6 h-6" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            <button
              onClick={handleClear}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg active:scale-95 transition"
            >
              Limpiar
            </button>
            <button
              onClick={handleConfirm}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg active:scale-95 transition"
            >
              ✓ Confirmar
            </button>
          </div>

          <button
            onClick={onCancel}
            className="w-full bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-3 rounded-lg active:scale-95 transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
