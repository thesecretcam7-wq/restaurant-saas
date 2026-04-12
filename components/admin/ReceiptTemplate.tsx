'use client';

interface ReceiptItem {
  name: string;
  price: number;
  qty: number;
}

interface ReceiptTemplateProps {
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
}

export function ReceiptTemplate({
  restaurantName,
  restaurantLogo,
  orderNumber,
  date,
  waiterName,
  tableNumber,
  items,
  subtotal,
  tax = 0,
  discount = 0,
  total,
  paymentMethod,
  amountPaid,
  change,
  notes,
  footerText,
}: ReceiptTemplateProps) {
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const dateStr = date.toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="w-80 bg-white text-black font-mono text-xs p-0">
      {/* Header */}
      <div className="border-b border-black text-center py-2">
        {restaurantLogo && (
          <img
            src={restaurantLogo}
            alt={restaurantName}
            className="h-12 mx-auto mb-2"
          />
        )}
        <p className="text-sm font-bold">{restaurantName}</p>
        <p className="text-xs text-gray-600">Recibo de Venta</p>
      </div>

      {/* Order Info */}
      <div className="border-b border-black py-2 px-2">
        <div className="flex justify-between mb-1">
          <span>Orden #:</span>
          <span className="font-bold">{orderNumber}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span>Fecha:</span>
          <span>{dateStr}</span>
        </div>

        {waiterName && (
          <div className="flex justify-between mb-1">
            <span>Camarero:</span>
            <span>{waiterName}</span>
          </div>
        )}

        {tableNumber && (
          <div className="flex justify-between">
            <span>Mesa:</span>
            <span className="font-bold">{tableNumber}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="border-b border-black py-2 px-2">
        <div className="mb-1 pb-1 border-b border-gray-300">
          <div className="flex justify-between text-xs mb-1">
            <span className="flex-1">Producto</span>
            <span className="w-8 text-right">Qty</span>
            <span className="w-12 text-right">Precio</span>
            <span className="w-16 text-right">Total</span>
          </div>
        </div>

        {items.map((item, idx) => (
          <div key={idx} className="mb-1">
            <div className="flex justify-between text-xs">
              <span className="flex-1 truncate">{item.name}</span>
              <span className="w-8 text-right">{item.qty}</span>
              <span className="w-12 text-right">{formatCurrency(item.price)}</span>
              <span className="w-16 text-right font-bold">
                {formatCurrency(item.price * item.qty)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-b border-black py-2 px-2">
        <div className="flex justify-between mb-1 text-xs">
          <span>Subtotal:</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>

        {tax > 0 && (
          <div className="flex justify-between mb-1 text-xs">
            <span>Impuesto:</span>
            <span>{formatCurrency(tax)}</span>
          </div>
        )}

        {discount > 0 && (
          <div className="flex justify-between mb-1 text-xs text-green-600">
            <span>Descuento:</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
        )}

        <div className="flex justify-between pt-1 border-t border-black font-bold text-sm">
          <span>TOTAL:</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Payment Info */}
      <div className="border-b border-black py-2 px-2">
        <div className="mb-1">
          <span className="text-xs">
            Pago: {paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'}
          </span>
        </div>

        {paymentMethod === 'cash' && amountPaid && change !== undefined && (
          <>
            <div className="flex justify-between text-xs mb-1">
              <span>Recibido:</span>
              <span>{formatCurrency(amountPaid)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-green-600">
              <span>Cambio:</span>
              <span>{formatCurrency(change)}</span>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-2 px-2">
        {notes && (
          <p className="text-xs mb-1 italic text-gray-600">{notes}</p>
        )}
        {footerText && (
          <p className="text-xs text-gray-600 border-t border-black pt-1">
            {footerText}
          </p>
        )}
        <p className="text-xs text-gray-600 mt-2">Gracias por su compra</p>
        <p className="text-xs text-gray-600">Vuelva pronto</p>
      </div>
    </div>
  );
}
