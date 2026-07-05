'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Delete, Space, X } from 'lucide-react';

interface TextKeyboardProps {
  isOpen: boolean;
  title: string;
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  maxLength?: number;
  multiline?: boolean;
}

const letterRows = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

const numberRow = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

export function TextKeyboard({
  isOpen,
  title,
  value,
  onChange,
  onConfirm,
  onCancel,
  maxLength = 80,
  multiline = false,
}: TextKeyboardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
        return;
      }

      if (event.key === 'Enter' && !multiline) {
        event.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, multiline, onCancel, onConfirm]);

  if (!isOpen || !mounted) return null;

  const portalTarget = document.fullscreenElement ?? document.body;
  const appendText = (text: string) => {
    onChange((value + text).slice(0, maxLength));
  };
  const backspace = () => onChange(value.slice(0, -1));
  const keyClass =
    'min-h-12 rounded-xl border border-slate-200 bg-white px-2 text-lg font-black text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition hover:border-sky-300 hover:bg-sky-50 active:scale-95';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/20 p-3 sm:items-center">
      <div className="w-full max-w-4xl overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white text-slate-950 shadow-[0_28px_90px_rgba(15,23,42,0.24)]">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-700">Teclado</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-sky-300 hover:text-sky-700"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="min-h-16 w-full whitespace-pre-wrap break-words rounded-2xl border border-sky-200 bg-white p-4 text-2xl font-black text-slate-950 shadow-inner">
            {value || <span className="text-slate-400">Escribe aqui...</span>}
          </div>
        </div>

        <div className="space-y-3 p-5">
          <div className="grid grid-cols-10 gap-2">
            {numberRow.map((key) => (
              <button key={key} type="button" onClick={() => appendText(key)} className={keyClass}>
                {key}
              </button>
            ))}
          </div>

          {letterRows.map((row) => (
            <div key={row.join('')} className="flex justify-center gap-2">
              {row.map((key) => (
                <button key={key} type="button" onClick={() => appendText(key)} className={`${keyClass} w-14 flex-1`}>
                  {key}
                </button>
              ))}
            </div>
          ))}

          <div className="grid grid-cols-4 gap-2 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={() => appendText(' ')}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 font-black text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 active:scale-95"
            >
              <Space className="h-5 w-5" />
              Espacio
            </button>
            <button
              type="button"
              onClick={backspace}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 font-black text-red-700 transition hover:bg-red-100 active:scale-95"
            >
              <Delete className="h-5 w-5" />
              Borrar
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 font-black text-slate-700 transition hover:bg-white active:scale-95"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 font-black text-white shadow-[0_14px_28px_rgba(2,132,199,0.22)] transition hover:bg-sky-700 active:scale-95"
            >
              <Check className="h-5 w-5" />
              Listo
            </button>
          </div>
        </div>
      </div>
    </div>,
    portalTarget
  );
}
