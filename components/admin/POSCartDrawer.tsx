'use client';

import { useState } from 'react';
import { X, Plus, Minus, Trash2 } from 'lucide-react';
import { getCurrencyByCountry, formatPriceWithCurrency } from '@/lib/currency';
import { NumericKeyboard } from './NumericKeyboard';

interface CartItem {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface POSCartDrawerProps {
  isOpen: boolean;
  cartItems: CartItem[];
  subtotal: number;
  discount: number;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateNotes: (itemId: string, notes: string) => void;
  onClose: () => void;
  country?: string;
}

export function POSCartDrawer({
  isOpen,
  cartItems,
  subtotal,
  discount,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateNotes,
  onClose,
  country = 'CO',
}: POSCartDrawerProps) {
  const currencyInfo = getCurrencyByCountry(country);
  const total = subtotal - discount;
  const [showNumericKeyboard, setShowNumericKeyboard] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingQuantity, setEditingQuantity] = useState(0);

  const handleEditQuantity = (itemId: string, currentQuantity: number) => {
    setSelectedItemId(itemId);
    setEditingQuantity(currentQuantity);
    setShowNumericKeyboard(true);
  };

  const handleConfirmQuantity = (value: number) => {
    if (selectedItemId && value > 0) {
      onUpdateQuantity(selectedItemId, value);
    }
    setShowNumericKeyboard(false);
    setSelectedItemId(null);
    setEditingQuantity(0);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-muted border-l border-border flex flex-col z-50 transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 flex-shrink-0">
          <h2 className="text-lg font-bold text-white">Carrito</h2>
          <button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 text-white rounded p-1.5 transition"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto border-b border-border">
          {cartItems.length === 0 ? (
            <div className="text-center text-gray-500 text-sm p-4">
              Carrito vacío
            </div>
          ) : (
            <div className="space-y-2 p-3">
              {cartItems.map((item) => (
                <div
                  key={item.menu_item_id}
                  className="bg-card rounded p-3 space-y-2 border border-border"
                >
                  {/* Item Header - Name and Price */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-white truncate">
                        {item.name}
                      </p>
                      <p className="text-green-400 font-bold text-sm">
                        {formatPriceWithCurrency(item.price, currencyInfo.code, currencyInfo.locale)}
                      </p>
                    </div>
                    <button
                      onClick={() => onRemoveItem(item.menu_item_id)}
                      className="flex-shrink-0 bg-red-600 hover:bg-red-700 text-white rounded p-1.5 transition"
                      title="Eliminar producto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (item.quantity > 1) {
                          onUpdateQuantity(item.menu_item_id, item.quantity - 1);
                        }
                      }}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 rounded py-1 transition"
                    >
                      <Minus className="w-4 h-4 mx-auto text-white" />
                    </button>
                    <button
                      onClick={() => handleEditQuantity(item.menu_item_id, item.quantity)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 rounded py-2 px-3 font-bold text-sm text-white transition text-center"
                      title="Toca para editar cantidad"
                    >
                      {item.quantity}
                    </button>
                    <button
                      onClick={() => onUpdateQuantity(item.menu_item_id, item.quantity + 1)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 rounded py-1 transition"
                    >
                      <Plus className="w-4 h-4 mx-auto text-white" />
                    </button>
                  </div>

                  {/* Nota especial */}
                  <input
                    type="text"
                    value={item.notes ?? ''}
                    onChange={e => onUpdateNotes(item.menu_item_id, e.target.value)}
                    placeholder="Nota: sin cebolla, término..."
                    maxLength={80}
                    className="w-full px-2 py-1.5 rounded bg-gray-900 border border-gray-600 focus:border-yellow-500 outline-none text-yellow-300 placeholder-gray-600 text-xs"
                  />

                  {/* Item Total */}
                  <div className="flex justify-between items-center text-xs text-muted-foreground border-t border-gray-600 pt-2">
                    <span>Subtotal:</span>
                    <span className="font-bold">
                      {formatPriceWithCurrency(item.price * item.quantity, currencyInfo.code, currencyInfo.locale)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Footer */}
        <div className="border-t border-border bg-card p-3 flex-shrink-0 space-y-2">
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-bold text-white">{formatPriceWithCurrency(subtotal, currencyInfo.code, currencyInfo.locale)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Descuento:</span>
                <span className="font-bold">-{formatPriceWithCurrency(discount, currencyInfo.code, currencyInfo.locale)}</span>
              </div>
            )}
          </div>
          <div className="border-t border-border pt-2 flex justify-between text-base font-bold text-white">
            <span>Total:</span>
            <span className="text-green-400">{formatPriceWithCurrency(total, currencyInfo.code, currencyInfo.locale)}</span>
          </div>
        </div>
      </div>

      {/* Numeric Keyboard Modal */}
      <NumericKeyboard
        isOpen={showNumericKeyboard}
        title="Editar Cantidad"
        initialValue={editingQuantity}
        onConfirm={handleConfirmQuantity}
        onCancel={() => {
          setShowNumericKeyboard(false);
          setSelectedItemId(null);
          setEditingQuantity(0);
        }}
        allowDecimal={false}
      />
    </>
  );
}
