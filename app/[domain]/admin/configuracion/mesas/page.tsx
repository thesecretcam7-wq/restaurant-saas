'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2, Edit2, Check, X, Users, MapPin } from 'lucide-react';

interface Table {
  id: string;
  table_number: number;
  seats: number;
  location: string | null;
  status: string;
}

const STATUS_OPTIONS = [
  { value: 'available', label: 'Disponible' },
  { value: 'maintenance', label: 'Mantenimiento' },
];

export default function MesasPage() {
  const params = useParams();
  const domain = params.domain as string;
  const supabase = useMemo(() => createClient(), []);

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newNumber, setNewNumber] = useState('');
  const [newSeats, setNewSeats] = useState('4');
  const [newLocation, setNewLocation] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSeats, setEditSeats] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editStatus, setEditStatus] = useState('');

  useEffect(() => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(domain);
    supabase
      .from('tenants').select('id')
      .eq(isUUID ? 'id' : 'slug', domain).single()
      .then(({ data }) => { if (data) setTenantId(data.id); });
  }, [domain, supabase]);

  useEffect(() => { if (tenantId) fetchTables(); }, [tenantId]);

  async function fetchTables() {
    setLoading(true);
    const res = await fetch(`/api/tables?tenantId=${tenantId}`);
    if (res.ok) setTables(await res.json());
    else setError('Error al cargar mesas');
    setLoading(false);
  }

  async function addTable() {
    if (!newNumber || !tenantId) return;
    const num = parseInt(newNumber);
    if (isNaN(num) || num < 1) { setError('Número de mesa inválido'); return; }
    if (tables.some(t => t.table_number === num)) { setError(`La mesa ${num} ya existe`); return; }
    setSaving(true); setError(null);
    const res = await fetch('/api/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, table_number: num, seats: parseInt(newSeats) || 4, location: newLocation || null }),
    });
    if (res.ok) { setNewNumber(''); setNewSeats('4'); setNewLocation(''); setShowForm(false); await fetchTables(); }
    else { const d = await res.json(); setError(d.error || 'Error al guardar'); }
    setSaving(false);
  }

  async function saveEdit(id: string) {
    setSaving(true); setError(null);
    const res = await fetch('/api/tables', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, seats: parseInt(editSeats) || 4, location: editLocation || null, status: editStatus }),
    });
    if (res.ok) { setEditingId(null); await fetchTables(); }
    else { const d = await res.json(); setError(d.error || 'Error al guardar'); }
    setSaving(false);
  }

  async function deleteTable(id: string, num: number) {
    if (!confirm(`¿Eliminar Mesa ${num}?`)) return;
    setSaving(true);
    const res = await fetch(`/api/tables?id=${id}`, { method: 'DELETE' });
    if (res.ok) await fetchTables();
    else { const d = await res.json(); setError(d.error || 'Error al eliminar'); }
    setSaving(false);
  }

  function startEdit(t: Table) {
    setEditingId(t.id);
    setEditSeats(String(t.seats));
    setEditLocation(t.location || '');
    setEditStatus(t.status || 'available');
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mesas</h1>
          <p className="text-gray-500 text-sm mt-1">Configura las mesas del restaurante para el TPV</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar mesa
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm flex items-center gap-2">
          <X className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="mb-5 bg-white border rounded-2xl p-5 space-y-4 shadow-sm">
          <p className="font-semibold text-gray-900 text-sm">Nueva mesa</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Número *</label>
              <input
                type="number" min="1"
                value={newNumber}
                onChange={e => setNewNumber(e.target.value)}
                placeholder="1"
                className="w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Asientos</label>
              <input
                type="number" min="1"
                value={newSeats}
                onChange={e => setNewSeats(e.target.value)}
                placeholder="4"
                className="w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Zona (opcional)</label>
              <input
                type="text"
                value={newLocation}
                onChange={e => setNewLocation(e.target.value)}
                placeholder="Terraza, Interior..."
                className="w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm">Cancelar</button>
            <button
              onClick={addTable}
              disabled={saving || !newNumber}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              <Check className="w-4 h-4" />
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Cargando...</div>
      ) : tables.length === 0 ? (
        <div className="bg-white border rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">🪑</p>
          <p className="font-semibold text-gray-900">Sin mesas configuradas</p>
          <p className="text-gray-400 text-sm mt-1">Agrega mesas para usar el mapa y la barra del TPV</p>
        </div>
      ) : (
        <div className="bg-white border rounded-2xl divide-y overflow-hidden">
          {tables.map(t => (
            <div key={t.id} className="flex items-center gap-4 px-4 py-3.5">
              {/* Number badge */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl w-11 h-11 flex items-center justify-center shrink-0">
                <span className="text-blue-700 font-black text-base">{t.table_number}</span>
              </div>

              {editingId === t.id ? (
                <div className="flex-1 grid grid-cols-3 gap-2 items-center">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <input
                      type="number" min="1"
                      value={editSeats}
                      onChange={e => setEditSeats(e.target.value)}
                      className="w-full px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      value={editLocation}
                      onChange={e => setEditLocation(e.target.value)}
                      placeholder="Zona"
                      className="w-full px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value)}
                    className="px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-gray-700 text-sm">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    {t.seats} asientos
                  </div>
                  {t.location && (
                    <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      {t.location}
                    </div>
                  )}
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    t.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {t.status === 'available' ? 'Disponible' : 'Mantenimiento'}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-1 shrink-0">
                {editingId === t.id ? (
                  <>
                    <button onClick={() => saveEdit(t.id)} disabled={saving} className="p-1.5 text-green-600 hover:text-green-700 transition-colors">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(t)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteTable(t.id, t.table_number)} disabled={saving} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-gray-400 text-xs mt-4">
        {tables.length} mesa{tables.length !== 1 ? 's' : ''} configurada{tables.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
