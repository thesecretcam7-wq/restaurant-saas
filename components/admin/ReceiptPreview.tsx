'use client';

import { useState } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { ReceiptTemplate } from './ReceiptTemplate';

interface ReceiptItem {
  name: string;
  price: number;
  qty: number;
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
      // Open print dialog
      window.print();
      // Call parent's onPrint callback
      onPrint();
      // Close preview after print (optional - remove if you want to keep it open)
      setTimeout(() => {
        onClose();
      }, 500);
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
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
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

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .fixed {
            position: static !important;
            background: white !important;
          }
          .bg-muted, .bg-card {
            background: white !important;
          }
          .text-white {
            color: black !important;
          }
          .border-border {
            border-color: black !important;
          }
          .shadow-lg, .shadow-xl {
            box-shadow: none !important;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
