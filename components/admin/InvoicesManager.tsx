'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { FileText, Download, Check, Clock, AlertCircle } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  total: number;
  payment_status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  invoice_date: string;
  order_id: string;
}

export function InvoicesManager({ tenantId }: { tenantId: string }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');

  useEffect(() => {
    fetchInvoices();
  }, [tenantId, filterStatus]);

  async function fetchInvoices() {
    setLoading(true);
    try {
      let query = supabase
        .from('invoices')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('invoice_date', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('payment_status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  }

  async function generateInvoiceForOrder(orderId: string) {
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tenantId, orderId }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Error: ${error.error}`);
        return;
      }

      await fetchInvoices();
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Error al generar factura');
    }
  }

  async function markAsPaid(invoiceId: string) {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          payment_status: 'paid',
          payment_date: new Date().toISOString(),
        })
        .eq('id', invoiceId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await fetchInvoices();
    } catch (error) {
      console.error('Error updating invoice:', error);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <Check className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-50 border-green-200';
      case 'pending':
        return 'bg-blue-50 border-blue-200';
      case 'overdue':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Cargando facturas...</div>;
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Facturas</h1>

          {/* Filters */}
          <div className="flex gap-2">
            {(['all', 'pending', 'paid', 'overdue'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                }`}
              >
                {status === 'all' && 'Todas'}
                {status === 'pending' && 'Pendientes'}
                {status === 'paid' && 'Pagadas'}
                {status === 'overdue' && 'Vencidas'}
              </button>
            ))}
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-gray-600 font-semibold">No hay facturas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className={`bg-white rounded-lg shadow p-6 border-l-4 transition hover:shadow-lg ${getStatusColor(
                  invoice.payment_status
                )}`}
              >
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  {/* Invoice Number and Customer */}
                  <div>
                    <p className="text-sm text-gray-600">Factura</p>
                    <p className="font-bold text-lg text-gray-900">{invoice.invoice_number}</p>
                    <p className="text-sm text-gray-700">{invoice.customer_name}</p>
                  </div>

                  {/* Date */}
                  <div>
                    <p className="text-sm text-gray-600">Fecha</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Total */}
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="font-bold text-lg text-gray-900">${invoice.total.toFixed(2)}</p>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    {getStatusIcon(invoice.payment_status)}
                    <span className="font-semibold text-gray-900 capitalize">
                      {invoice.payment_status === 'pending' && 'Pendiente'}
                      {invoice.payment_status === 'paid' && 'Pagada'}
                      {invoice.payment_status === 'overdue' && 'Vencida'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 justify-end">
                    {invoice.payment_status === 'pending' && (
                      <button
                        onClick={() => markAsPaid(invoice.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-semibold transition"
                      >
                        Marcar Pagada
                      </button>
                    )}
                    <button className="bg-gray-600 hover:bg-muted text-white px-3 py-2 rounded text-sm font-semibold flex items-center gap-1 transition">
                      <Download className="w-4 h-4" /> Descargar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
