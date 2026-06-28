'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTenantResolver } from '@/lib/hooks/useTenantResolver';
import { printTableQrReceipt } from '@/lib/pos-printer';
import { Check, Copy, Download, ExternalLink, Printer, QrCode, RefreshCw } from 'lucide-react';

interface Table {
  id: string;
  table_number: number;
  seats: number;
  location: string | null;
  status: string;
}

interface TableQr {
  id: string;
  table_id: string;
  unique_code: string;
  qr_code_data: string;
  is_active: boolean;
  tables?: Table | Table[] | null;
}

function qrTable(qr?: TableQr | null) {
  if (!qr?.tables) return null;
  return Array.isArray(qr.tables) ? qr.tables[0] || null : qr.tables;
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function isLocalUrl(value: string) {
  try {
    const url = new URL(value);
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
}

export default function QRCodesPage() {
  const params = useParams();
  const domain = String(params.domain || '');
  const { tenantId, loading: resolvingTenant } = useTenantResolver(domain);

  const [tables, setTables] = useState<Table[]>([]);
  const [qrCodes, setQrCodes] = useState<TableQr[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingTableId, setGeneratingTableId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrBaseUrl, setQrBaseUrl] = useState('');
  const [printingCode, setPrintingCode] = useState<string | null>(null);

  const qrByTableId = useMemo(() => {
    const map = new Map<string, TableQr>();
    qrCodes.forEach((qr) => {
      if (qr.table_id) map.set(qr.table_id, qr);
    });
    return map;
  }, [qrCodes]);

  const effectiveQrBaseUrl = useMemo(() => normalizeBaseUrl(qrBaseUrl), [qrBaseUrl]);
  const usingLocalhost = useMemo(() => isLocalUrl(effectiveQrBaseUrl), [effectiveQrBaseUrl]);

  useEffect(() => {
    let cancelled = false;

    async function resolveQrBaseUrl() {
      const configuredUrl = process.env.NEXT_PUBLIC_TABLE_QR_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
      const storedUrl = window.localStorage.getItem('eccofood-table-qr-base-url') || '';
      const preferredUrl = [storedUrl, configuredUrl].find((value) => value && !isLocalUrl(value));

      if (preferredUrl) {
        setQrBaseUrl(normalizeBaseUrl(preferredUrl));
        return;
      }

      if (isLocalUrl(window.location.origin)) {
        try {
          const response = await fetch('/api/local-network-url', { cache: 'no-store' });
          const payload = await response.json();
          if (!cancelled && response.ok && payload.baseUrl) {
            setQrBaseUrl(normalizeBaseUrl(payload.baseUrl));
            return;
          }
        } catch {
          // Keep localhost as the fallback when the local network address cannot be detected.
        }
      }

      if (!cancelled) setQrBaseUrl(normalizeBaseUrl(configuredUrl || storedUrl || window.location.origin));
    }

    resolveQrBaseUrl();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    fetchData();
  }, [tenantId]);

  async function fetchData() {
    if (!tenantId) return;
    setLoading(true);
    setError(null);

    try {
      const [tablesResponse, qrResponse] = await Promise.all([
        fetch(`/api/tables?tenantId=${encodeURIComponent(tenantId)}`, { credentials: 'include', cache: 'no-store' }),
        fetch(`/api/table-qr?tenantId=${encodeURIComponent(tenantId)}`, { credentials: 'include', cache: 'no-store' }),
      ]);

      const [tablesPayload, qrPayload] = await Promise.all([
        tablesResponse.json(),
        qrResponse.json(),
      ]);

      if (!tablesResponse.ok) throw new Error(tablesPayload.error || 'Error al cargar mesas');
      if (!qrResponse.ok) throw new Error(qrPayload.error || 'Error al cargar codigos QR');

      setTables(tablesPayload || []);
      setQrCodes(qrPayload || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar codigos QR');
    } finally {
      setLoading(false);
    }
  }

  function updateQrBaseUrl(value: string) {
    setQrBaseUrl(value);
    const normalized = normalizeBaseUrl(value);
    if (normalized) {
      window.localStorage.setItem('eccofood-table-qr-base-url', normalized);
    } else {
      window.localStorage.removeItem('eccofood-table-qr-base-url');
    }
  }

  function getQrBaseUrl() {
    return effectiveQrBaseUrl || window.location.origin;
  }

  async function generateQRForTable(tableId: string) {
    if (!tenantId) return;
    setGeneratingTableId(tableId);
    setError(null);

    try {
      const response = await fetch('/api/table-qr', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          tableId,
          siteUrl: getQrBaseUrl(),
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No se pudo generar el QR');

      setQrCodes((current) => [
        payload,
        ...current.filter((qr) => qr.id !== payload.id && qr.table_id !== payload.table_id),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar QR');
    } finally {
      setGeneratingTableId(null);
    }
  }

  function downloadQR(qr: TableQr, table: Table) {
    const link = document.createElement('a');
    link.href = qr.qr_code_data;
    link.download = `qr-mesa-${table.table_number}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function copyLink(qr: TableQr) {
    const url = `${getQrBaseUrl()}/order/${qr.unique_code}`;
    await navigator.clipboard.writeText(url);
    setCopiedCode(qr.unique_code);
    window.setTimeout(() => setCopiedCode(null), 1800);
  }

  async function printQR(qr: TableQr, table: Table) {
    if (!tenantId) return;
    setPrintingCode(qr.unique_code);
    setError(null);

    try {
      await printTableQrReceipt(tenantId, {
        tableNumber: table.table_number,
        tableLocation: table.location,
        orderUrl: `${getQrBaseUrl()}/order/${qr.unique_code}`,
        qrImageData: qr.qr_code_data,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo imprimir el QR');
    } finally {
      setPrintingCode(null);
    }
  }

  if (resolvingTenant || loading) {
    return (
      <div className="admin-panel p-6">
        <p className="text-sm font-bold text-slate-500">Cargando codigos QR...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Autoservicio</p>
          <h1 className="admin-title">QR de mesas</h1>
          <p className="admin-subtitle">Cada mesa abre una carta para pedir directo al POS y cocina.</p>
        </div>
        <button
          type="button"
          onClick={fetchData}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-700/20 bg-white px-4 text-sm font-black text-slate-800 transition hover:bg-slate-50"
        >
          <RefreshCw className="size-4" />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <section className="admin-panel p-4">
        <label className="block">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">URL para celular</span>
          <input
            value={qrBaseUrl}
            onChange={(event) => updateQrBaseUrl(event.target.value)}
            placeholder="http://IP-DE-TU-PC:3002"
            className="mt-2 h-11 w-full rounded-xl border border-slate-700/20 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
          />
        </label>
        <p className="mt-2 text-xs font-semibold text-slate-500">
          Para probar con celular, usa la direccion de este computador en el Wi-Fi. Los QR nuevos y actualizados usaran esta URL.
        </p>
        {usingLocalhost && (
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800">
            Cambia localhost por la IP del computador; en el celular localhost apunta al propio telefono.
          </p>
        )}
      </section>

      {tables.length === 0 ? (
        <section className="admin-panel p-8 text-center">
          <QrCode className="mx-auto size-12 text-slate-400" />
          <h2 className="mt-4 text-lg font-black text-slate-950">No hay mesas configuradas</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">Primero crea las mesas del restaurante.</p>
          <Link
            href={`/${domain}/admin/configuracion/mesas`}
            className="mt-5 inline-flex h-11 items-center rounded-xl bg-slate-950 px-5 text-sm font-black text-white"
          >
            Configurar mesas
          </Link>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tables.map((table) => {
            const qr = qrByTableId.get(table.id);
            const relatedTable = qrTable(qr) || table;
            const orderUrl = qr ? `${getQrBaseUrl()}/order/${qr.unique_code}` : '';
            const busy = generatingTableId === table.id;
            const printing = printingCode === qr?.unique_code;

            return (
              <article key={table.id} className="admin-panel overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800/10 p-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">Mesa</p>
                    <h2 className="text-2xl font-black text-slate-950">{table.table_number}</h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    {table.location || `${table.seats} asientos`}
                  </span>
                </div>

                <div className="p-4">
                  {qr ? (
                    <>
                      <div className="rounded-2xl border border-slate-200 bg-white p-3">
                        <img
                          src={qr.qr_code_data}
                          alt={`QR Mesa ${relatedTable.table_number}`}
                          className="mx-auto aspect-square w-full max-w-[240px] object-contain"
                        />
                      </div>
                      <p className="mt-3 break-all rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
                        {orderUrl}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <button
                          type="button"
                          onClick={() => downloadQR(qr, table)}
                          className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-orange-600 text-xs font-black text-white"
                        >
                          <Download className="size-4" />
                          QR
                        </button>
                        <button
                          type="button"
                          onClick={() => printQR(qr, relatedTable)}
                          disabled={printing}
                          className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-emerald-600 text-xs font-black text-white disabled:opacity-50"
                        >
                          <Printer className="size-4" />
                          {printing ? '...' : 'Imprimir'}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyLink(qr)}
                          className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-slate-100 text-xs font-black text-slate-700"
                        >
                          {copiedCode === qr.unique_code ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                          Link
                        </button>
                        <Link
                          href={orderUrl}
                          target="_blank"
                          className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-slate-950 text-xs font-black text-white"
                        >
                          <ExternalLink className="size-4" />
                          Abrir
                        </Link>
                      </div>
                      <button
                        type="button"
                        onClick={() => generateQRForTable(table.id)}
                        disabled={busy}
                        className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-50 text-xs font-black text-orange-700 disabled:opacity-50"
                      >
                        <RefreshCw className="size-4" />
                        {busy ? 'Actualizando...' : 'Actualizar QR con esta URL'}
                      </button>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                      <QrCode className="mx-auto size-12 text-slate-400" />
                      <p className="mt-3 text-sm font-black text-slate-800">Sin QR generado</p>
                      <button
                        type="button"
                        onClick={() => generateQRForTable(table.id)}
                        disabled={busy}
                        className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 text-sm font-black text-white disabled:opacity-50"
                      >
                        <QrCode className="size-4" />
                        {busy ? 'Generando...' : 'Generar QR'}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
