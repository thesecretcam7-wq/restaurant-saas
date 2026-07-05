'use client';

import { useState } from 'react';
import { Keyboard, ReceiptText, X } from 'lucide-react';
import { getCurrencyByCountry } from '@/lib/currency';
import { useTouchDevice } from '@/lib/hooks/useTouchDevice';
import { NumericKeyboard } from './NumericKeyboard';
import { TextKeyboard } from './TextKeyboard';

interface BillPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    supplierName: string;
    concept: string;
    invoiceNumber: string;
    amount: number;
    notes: string;
  }) => Promise<void>;
  country?: string;
  isLoading?: boolean;
}

export function BillPaymentModal({
  isOpen,
  onClose,
  onConfirm,
  country = 'CO',
  isLoading = false,
}: BillPaymentModalProps) {
  const [supplierName, setSupplierName] = useState('');
  const [concept, setConcept] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAmountKeyboard, setShowAmountKeyboard] = useState(false);
  const [activeTextField, setActiveTextField] = useState<'supplierName' | 'concept' | 'invoiceNumber' | 'notes' | null>(null);
  const [textKeyboardDraft, setTextKeyboardDraft] = useState('');
  const isTouchDevice = useTouchDevice();
  const currencyInfo = getCurrencyByCountry(country);
  const isBusy = isSubmitting || isLoading;

  const inputClass =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-950 outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:opacity-50';
  const keyboardButtonClass =
    'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-black text-sky-700 transition hover:border-sky-300 hover:bg-sky-100 disabled:opacity-50';

  const textFieldMeta = {
    supplierName: {
      title: 'Proveedor o factura',
      value: supplierName,
      setValue: setSupplierName,
      maxLength: 80,
      multiline: false,
    },
    concept: {
      title: 'Concepto',
      value: concept,
      setValue: setConcept,
      maxLength: 60,
      multiline: false,
    },
    invoiceNumber: {
      title: 'Numero factura',
      value: invoiceNumber,
      setValue: setInvoiceNumber,
      maxLength: 40,
      multiline: false,
    },
    notes: {
      title: 'Nota',
      value: notes,
      setValue: setNotes,
      maxLength: 140,
      multiline: true,
    },
  };

  function openTextKeyboard(field: keyof typeof textFieldMeta) {
    setActiveTextField(field);
    setTextKeyboardDraft(textFieldMeta[field].value);
  }

  function confirmTextKeyboard() {
    if (activeTextField) {
      textFieldMeta[activeTextField].setValue(textKeyboardDraft);
    }
    setActiveTextField(null);
    setTextKeyboardDraft('');
  }

  function cancelTextKeyboard() {
    setActiveTextField(null);
    setTextKeyboardDraft('');
  }

  async function handleSubmit() {
    const numericAmount = Number(amount);
    if (!supplierName.trim()) {
      alert('Escribe a quien se pago la factura');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      alert('Escribe un importe valido');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm({
        supplierName: supplierName.trim(),
        concept: concept.trim(),
        invoiceNumber: invoiceNumber.trim(),
        amount: numericAmount,
        notes: notes.trim(),
      });
      setSupplierName('');
      setConcept('');
      setInvoiceNumber('');
      setAmount('');
      setNotes('');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[1.75rem] border border-slate-200 bg-white text-slate-950 shadow-[0_28px_90px_rgba(15,23,42,0.22)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-700">
              <ReceiptText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-700">Salida de caja</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Pagar factura</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isBusy}
            className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-sky-300 hover:text-sky-700 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <section>
            <label className="mb-2 block text-sm font-black uppercase tracking-[0.14em] text-sky-700">
              Proveedor o factura
            </label>
            <input
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              inputMode={isTouchDevice ? 'none' : 'text'}
              readOnly={isTouchDevice}
              onPointerDown={(e) => {
                if (!isTouchDevice) return;
                e.preventDefault();
                openTextKeyboard('supplierName');
              }}
              onFocus={() => {
                if (isTouchDevice) openTextKeyboard('supplierName');
              }}
              placeholder="Ej. Luz, agua, proveedor, alquiler..."
              disabled={isBusy}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => openTextKeyboard('supplierName')}
              disabled={isBusy}
              className={`${keyboardButtonClass} mt-3 w-full`}
            >
              <Keyboard className="h-4 w-4" />
              Teclado
            </button>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <section>
              <label className="mb-2 block text-sm font-black uppercase tracking-[0.14em] text-sky-700">
                Concepto
              </label>
              <input
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                inputMode={isTouchDevice ? 'none' : 'text'}
                readOnly={isTouchDevice}
                onPointerDown={(e) => {
                  if (!isTouchDevice) return;
                  e.preventDefault();
                  openTextKeyboard('concept');
                }}
                onFocus={() => {
                  if (isTouchDevice) openTextKeyboard('concept');
                }}
                placeholder="Compra, servicio, recibo..."
                disabled={isBusy}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => openTextKeyboard('concept')}
                disabled={isBusy}
                className={`${keyboardButtonClass} mt-3 w-full`}
              >
                <Keyboard className="h-4 w-4" />
                Teclado
              </button>
            </section>
            <section>
              <label className="mb-2 block text-sm font-black uppercase tracking-[0.14em] text-sky-700">
                Numero
              </label>
              <input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                inputMode={isTouchDevice ? 'none' : 'text'}
                readOnly={isTouchDevice}
                onPointerDown={(e) => {
                  if (!isTouchDevice) return;
                  e.preventDefault();
                  openTextKeyboard('invoiceNumber');
                }}
                onFocus={() => {
                  if (isTouchDevice) openTextKeyboard('invoiceNumber');
                }}
                placeholder="Opcional"
                disabled={isBusy}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => openTextKeyboard('invoiceNumber')}
                disabled={isBusy}
                className={`${keyboardButtonClass} mt-3 w-full`}
              >
                <Keyboard className="h-4 w-4" />
                Teclado
              </button>
            </section>
          </div>

          <section>
            <label className="mb-2 block text-sm font-black uppercase tracking-[0.14em] text-sky-700">
              Importe pagado en efectivo
            </label>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-sky-700">
                  {currencyInfo.symbol}
                </span>
                <input
                  type="number"
                  inputMode={isTouchDevice ? 'none' : 'decimal'}
                  step="0.01"
                  value={amount}
                  readOnly={isTouchDevice}
                  onPointerDown={(e) => {
                    if (!isTouchDevice) return;
                    e.preventDefault();
                    setShowAmountKeyboard(true);
                  }}
                  onFocus={() => {
                    if (isTouchDevice) setShowAmountKeyboard(true);
                  }}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={isBusy}
                  className={`${inputClass} pl-10`}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowAmountKeyboard(true)}
                disabled={isBusy}
                className={keyboardButtonClass}
              >
                <Keyboard className="h-4 w-4" />
                Teclado
              </button>
            </div>
          </section>

          <section>
            <label className="mb-2 block text-sm font-black uppercase tracking-[0.14em] text-sky-700">
              Nota
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              inputMode={isTouchDevice ? 'none' : 'text'}
              readOnly={isTouchDevice}
              onPointerDown={(e) => {
                if (!isTouchDevice) return;
                e.preventDefault();
                openTextKeyboard('notes');
              }}
              onFocus={() => {
                if (isTouchDevice) openTextKeyboard('notes');
              }}
              placeholder="Opcional"
              disabled={isBusy}
              rows={3}
              className={`${inputClass} resize-none`}
            />
            <button
              type="button"
              onClick={() => openTextKeyboard('notes')}
              disabled={isBusy}
              className={`${keyboardButtonClass} mt-3 w-full`}
            >
              <Keyboard className="h-4 w-4" />
              Teclado
            </button>
          </section>
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-white p-6">
          <button
            onClick={onClose}
            disabled={isBusy}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isBusy || !supplierName.trim() || !amount}
            className="flex-1 rounded-2xl bg-sky-600 px-4 py-3 font-black text-white shadow-[0_16px_35px_rgba(2,132,199,0.24)] transition hover:bg-sky-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando...' : 'Registrar pago'}
          </button>
        </div>
      </div>

      <NumericKeyboard
        isOpen={showAmountKeyboard}
        title="Importe factura"
        initialValue={amount ? Number(amount) : 0}
        onConfirm={(value) => {
          setAmount(value.toString());
          setShowAmountKeyboard(false);
        }}
        onCancel={() => setShowAmountKeyboard(false)}
        allowDecimal
      />

      {activeTextField && (
        <TextKeyboard
          isOpen={Boolean(activeTextField)}
          title={textFieldMeta[activeTextField].title}
          value={textKeyboardDraft}
          onChange={setTextKeyboardDraft}
          onConfirm={confirmTextKeyboard}
          onCancel={cancelTextKeyboard}
          maxLength={textFieldMeta[activeTextField].maxLength}
          multiline={textFieldMeta[activeTextField].multiline}
        />
      )}
    </div>
  );
}
