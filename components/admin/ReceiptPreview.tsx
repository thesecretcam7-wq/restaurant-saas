'use client';

import { useState } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { ReceiptTemplate } from './ReceiptTemplate';

interface ReceiptItem {
  name: string;
  price: number;
  qty: number;
  notes?: string;
}

interface ReceiptPreviewProps {
  restaurantName: string;
  restaurantLogo?: string;
  orderNumber: string;
  date: Date;
  waiterName?: string;
  tableNumber?: number;
  items: ReceiptItem[];
  subtotal: number;
  tax?: number;
  discount?: number;
  tip?: number;
  total: number;
  paymentMethod: 'cash' | 'stripe';
  amountPaid?: number;
  change?: number;
  notes?: string;
  footerText?: string;
  onClose: () => void;
  onPrint: () => void;
  onProcessWithoutPrint: () => void;
  loading?: boolean;
}

export function ReceiptPreview({
  restaurantName,
  restaurantLogo,
  orderNumber,
  date,
  waiterName,
  tableNumber,
  items,
  subtotal,
  tax,
  discount,
  tip,
  total,
  paymentMethod,
  amountPaid,
  change,
  notes,
  footerText,
  onClose,
  onPrint,
  onProcessWithoutPrint,
  loading = false,
}: ReceiptPreviewProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const receiptEl = document.getElementById('pos-receipt-content');
      if (!receiptEl) return;

      // Hidden iframe — prints ONLY the receipt, not the full TPV screen
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
      if (!doc) { document.body.removeChild(iframe); return; }

      doc.open();
      doc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Courier New',Courier,monospace;font-size:12px;width:80mm;color:#000}
        .flex{display:flex}.justify-between{justify-content:space-between}
        .text-center{text-align:center}.text-right{text-align:right}
        .font-bold{font-weight:bold}.flex-1{flex:1}
        .border-b{border-bottom:1px solid #000}.border-t{border-top:1px solid #000}
        .border-gray-300{border-color:#ccc}
        .py-2{padding:8px 0}.px-2{padding:0 8px}
        .mb-1{margin-bottom:4px}.mt-2{margin-top:8px}
        .pt-1{padding-top:4px}.pb-1{padding-bottom:4px}
        .w-8{width:32px}.w-12{width:48px}.w-16{width:64px}
        .text-xs{font-size:11px}.text-sm{font-size:13px}
        .truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .italic{font-style:italic}
        .text-gray-600{color:#555}.text-green-600{color:#166534}
        img{max-height:48px;display:block;margin:0 auto 8px}
      </style></head><body>${receiptEl.innerHTML}</body></html>`);
      doc.close();

      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1500);
      }, 300);

      onPrint();
      setTimeout(onClose, 600);
    } catch (error) {
      console.error('Error printing:', error);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-muted rounded-lg shadow-xl max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Vista Previa de Recibo</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Receipt Preview */}
        <div className="p-4 flex justify-center bg-muted">
          <div id="pos-receipt-content" className="bg-white rounded-lg shadow-lg overflow-hidden">
            <ReceiptTemplate
              restaurantName={restaurantName}
              restaurantLogo={restaurantLogo}
              orderNumber={orderNumber}
              date={date}
              waiterName={waiterName}
              tableNumber={tableNumber}
              items={items}
              subtotal={subtotal}
              tax={tax}
              discount={discount}
              tip={tip}
              total={total}
              paymentMethod={paymentMethod}
              amountPaid={amountPaid}
              change={change}
              notes={notes}
              footerText={footerText}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-card border-t border-border p-4 flex gap-3">
          <button
            onClick={onClose}
            className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition"
          >
            Cerrar
          </button>
          <button
            onClick={onProcessWithoutPrint}
            disabled={loading}
            className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-bold transition"
          >
            Procesar sin Imprimir
          </button>
          <button
            onClick={handlePrint}
            disabled={loading || isPrinting}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition"
          >
            <Printer className="w-5 h-5" />
            {isPrinting ? 'Imprimiendo...' : 'Imprimir'}
          </button>
        </div>
      </div>

      {/* Suppress browser print of main page — only iframe prints */}
      <style>{`@media print { body > *:not(iframe) { display: none !important; } }`}</style>
    </div>
  );
}
