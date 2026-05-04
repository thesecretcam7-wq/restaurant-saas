'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { QrCode, Download, RefreshCw } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface QRCode {
  id: string;
  unique_code: string;
  qr_code_data: string;
  is_active: boolean;
  tables?: {
    table_number: number;
  };
}

export default function QRCodesPage() {
  const router = useRouter();
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string>('');

  useEffect(() => {
    async function init() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push('/login');
          return;
        }

        const { data: tenant } = await supabase
          .from('tenants')
          .select('id')
          .eq('owner_id', session.user.id)
          .single();

        if (tenant) {
          setTenantId(tenant.id);
          fetchQRCodes(tenant.id);
        }
      } catch (error) {
        console.error('Error initializing:', error);
        router.push('/login');
      }
    }

    init();
  }, [router]);

  async function fetchQRCodes(id: string) {
    try {
      const { data, error } = await supabase
        .from('table_qr_codes')
        .select('*, tables(*)')
        .eq('tenant_id', id);

      if (error) throw error;

      setQrCodes(data || []);
    } catch (error) {
      console.error('Error fetching QR codes:', error);
    } finally {
      setLoading(false);
    }
  }

  async function generateQRForTable(tableId: string) {
    try {
      const response = await fetch('/api/table-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          tableId,
          siteUrl: window.location.origin,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate QR');

      const newQR = await response.json();
      setQrCodes((prev) => {
        const filtered = prev.filter((qr) => qr.id !== newQR.id);
        return [newQR, ...filtered];
      });
    } catch (error) {
      console.error('Error generating QR:', error);
    }
  }

  async function downloadQR(qr: QRCode) {
    const link = document.createElement('a');
    link.href = qr.qr_code_data;
    link.download = `mesa-${qr.tables?.table_number || qr.unique_code}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Códigos QR de Mesas</h1>
          <p className="text-gray-600">Genera y gestiona códigos QR para que los clientes puedan pedir desde sus mesas</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {qrCodes.map((qr) => (
            <div
              key={qr.id}
              className="bg-white rounded-lg shadow-md p-4 text-center hover:shadow-lg transition"
            >
              <div className="mb-3">
                {qr.qr_code_data ? (
                  <img src={qr.qr_code_data} alt={`Mesa ${qr.tables?.table_number}`} />
                ) : (
                  <div className="w-full h-32 bg-gray-200 rounded flex items-center justify-center">
                    <QrCode className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
              <h3 className="font-bold text-gray-900 mb-2">
                Mesa {qr.tables?.table_number || 'N/A'}
              </h3>
              <p className="text-xs text-gray-500 mb-3 break-all">{qr.unique_code}</p>
              <button
                onClick={() => downloadQR(qr)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-semibold flex items-center justify-center gap-1 mb-2 transition"
              >
                <Download className="w-4 h-4" /> Descargar
              </button>
              <button
                onClick={() => generateQRForTable(String(qr.tables?.table_number || ''))}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded text-sm font-semibold flex items-center justify-center gap-1 transition"
              >
                <RefreshCw className="w-4 h-4" /> Regenerar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
