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
  { value: 'available', label: 'Disponible', color: 'text-emerald-400' },
  { value: 'maintenance', label: 'Mantenimiento', color: 'text-gray-400' },
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

  // Form for adding new table
  const [newNumber, setNewNumber] = useState('');
  const [newSeats, setNewSeats] = useState('4');
  const [newLocation, setNewLocation] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSeats, setEditSeats] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editStatus, setEditStatus] = useState('');

  useEffect(() => {
    supabase
      .from('tenants')
      .select('id')
      .eq('slug', domain)
      .single()
      .then(({ data }) => {
        if (data) setTenantId(data.id);
      });
  }, [domain, supabase]);

  useEffect(() => {
    if (!tenantId) return;
    fetchTables();
  }, [tenantId]);

  async function fetchTables() {
    setLoading(true);
    const { data, error } = await supabase
      .from('tables')
      .select('id, table_number, seats, location, status')
      .eq('tenant_id', tenantId!)
      .order('table_number', { ascending: true });
    if (error) setError(error.message);
    else setTables(data || []);
    setLoading(false);
  }

  async function addTable() {
    if (!newNumber || !tenantId) return;
    const num = parseInt(newNumber);
    if (isNaN(num) || num < 1) { setError('Número de mesa inválido'); return; }
    if (tables.some(t => t.table_number === num)) { setError(`La mesa ${num} ya existe`); return; }

    setSaving(true);
    setError(null);
    const { error } = await supabase.from('tables').insert({
      tenant_id: tenantId,
      table_number: num,
      seats: parseInt(newSeats) || 4,
      location: newLocation || null,
      status: 'available',
    });
    if (error) setError(error.message);
    else {
      setNewNumber('');
      setNewSeats('4');
      setNewLocation('');
      setShowForm(false);
      await fetchTables();
    }
    setSaving(false);
  }

  async function saveEdit(id: string) {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from('tables')
      .update({ seats: parseInt(editSeats) || 4, location: editLocation || null, status: editStatus })
      .eq('id', id);
    if (error) setError(error.message);
    else {
      setEditingId(null);
      await fetchTables();
    }
    setSaving(false);
  }

  async function deleteTable(id: string, num: number) {
    if (!confirm(`¿Eliminar Mesa ${num}?`)) return;
    setSaving(true);
    const { error } = await supabase.from('tables').delete().eq('id', id);
    if (error) setError(error.message);
    else await fetchTables();
    setSaving(false);
  }

  function startEdit(t: Table) {
    setEditingId(t.id);
    setEditSeats(String(t.seats));
    setEditLocation(t.location || '');
    setEditStatus(t.status || 'available');
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Mesas</h1>
          <p className="text-gray-400 text-sm mt-1">Configura las mesas del restaurante para el TPV y el mapa</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Agregar mesa
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/40 border border-red-600 rounded-xl px-4 py-3 text-red-300 text-sm flex items-center gap-2">
          <X className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-200">✕</button>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="mb-6 bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-3">
          <p className="text-white font-bold text-sm">Nueva mesa</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Número *</label>
              <input
                type="number"
                min="1"
                value={newNumber}
                onChange={e => setNewNumber(e.target.value)}
                placeholder="1"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 focus:border-blue-500 outline-none rounded-lg text-white text-sm"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Asientos</label>
              <input
                type="number"
                min="1"
                value={newSeats}
                onChange={e => setNewSeats(e.target.value)}
                placeholder="4"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 focus:border-blue-500 outline-none rounded-lg text-white text-sm"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Zona (opcional)</label>
              <input
                type="text"
                value={newLocation}
                onChange={e => setNewLocation(e.target.value)}
                placeholder="Terraza, Interior..."
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 focus:border-blue-500 outline-none rounded-lg text-white text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors">Cancelar</button>
            <button
              onClick={addTable}
              disabled={saving || !newNumber}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-bold text-sm transition-all"
            >
              <Check className="w-4 h-4" />
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Tables list */}
      {loading ? (
        <div className="text-gray-500 text-sm">Cargando...</div>
      ) : tables.length === 0 ? (
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-10 text-center">
          <p className="text-4xl mb-3">🪑</p>
          <p className="text-white font-bold">Sin mesas configuradas</p>
          <p className="text-gray-400 text-sm mt-1">Agrega mesas para usar el mapa y la barra del TPV</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tables.map(t => (
            <div key={t.id} className="bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 flex items-center gap-4">
              {/* Number badge */}
              <div className="bg-blue-600/20 border border-blue-500/40 rounded-xl w-12 h-12 flex items-center justify-center shrink-0">
                <span className="text-blue-300 font-black text-lg">{t.table_number}</span>
              </div>

              {editingId === t.id ? (
                <div className="flex-1 grid grid-cols-3 gap-2 items-center">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <input
                      type="number" min="1"
                      value={editSeats}
                      onChange={e => setEditSeats(e.target.value)}
                      className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <input
                      type="text"
                      value={editLocation}
                      onChange={e => setEditLocation(e.target.value)}
                      placeholder="Zona"
                      className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value)}
                    className="px-2 py-1 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm outline-none focus:border-blue-500"
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-gray-300 text-sm">
                    <Users className="w-3.5 h-3.5 text-gray-500" />
                    {t.seats} asientos
                  </div>
                  {t.location && (
                    <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                      <MapPin className="w-3.5 h-3.5 text-gray-500" />
                      {t.location}
                    </div>
                  )}
                  <span className={`text-xs font-semibold ${t.status === 'available' ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {t.status === 'available' ? 'Disponible' : 'Mantenimiento'}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-1 shrink-0">
                {editingId === t.id ? (
                  <>
                    <button onClick={() => saveEdit(t.id)} disabled={saving} className="p-1.5 text-emerald-400 hover:text-emerald-300 transition-colors">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(t)} className="p-1.5 text-gray-500 hover:text-blue-400 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteTable(t.id, t.table_number)} disabled={saving} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-gray-600 text-xs mt-6">
        {tables.length} mesa{tables.length !== 1 ? 's' : ''} configurada{tables.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
