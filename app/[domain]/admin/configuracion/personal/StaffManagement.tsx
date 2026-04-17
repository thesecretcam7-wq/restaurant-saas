'use client';

import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  role: 'cocinero' | 'camarero' | 'cajero';
  pin: string;
  is_active: boolean;
  created_at: string;
}

interface Props {
  tenantId: string;
  initialStaff: StaffMember[];
}

const ROLE_LABELS = {
  cocinero: { label: 'Cocinero', color: 'bg-orange-100 text-orange-700' },
  camarero: { label: 'Camarero', color: 'bg-emerald-100 text-emerald-700' },
  cajero: { label: 'Cajero', color: 'bg-indigo-100 text-indigo-700' },
};

export function StaffManagement({ tenantId, initialStaff }: Props) {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newStaff, setNewStaff] = useState({ name: '', role: 'camarero' as const, pin: '' });
  const [loading, setLoading] = useState(false);

  async function generatePin() {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setNewStaff(prev => ({ ...prev, pin }));
  }

  async function addStaff() {
    if (!newStaff.name || !newStaff.pin) return;
    setLoading(true);
    try {
      const res = await fetch('/api/staff/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, ...newStaff }),
      });
      if (res.ok) {
        const { staff: created } = await res.json();
        setStaff(prev => [created, ...prev]);
        setNewStaff({ name: '', role: 'camarero', pin: '' });
        setIsAddingNew(false);
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateStaff(id: string, updates: Partial<StaffMember>) {
    setLoading(true);
    try {
      const res = await fetch('/api/staff/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (res.ok) {
        const { staff: updated } = await res.json();
        setStaff(prev => prev.map(s => (s.id === id ? updated : s)));
        setEditingId(null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function deleteStaff(id: string) {
    if (!confirm('¿Eliminar este empleado?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/members?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStaff(prev => prev.filter(s => s.id !== id));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {isAddingNew && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Nuevo Empleado</h2>
          <div className="grid grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Nombre"
              value={newStaff.name}
              onChange={e => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            />
            <select
              value={newStaff.role}
              onChange={e => setNewStaff(prev => ({ ...prev, role: e.target.value as any }))}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="cocinero">Cocinero</option>
              <option value="camarero">Camarero</option>
              <option value="cajero">Cajero</option>
            </select>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="PIN"
                value={newStaff.pin}
                onChange={e => setNewStaff(prev => ({ ...prev, pin: e.target.value }))}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={generatePin}
                disabled={loading}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                Generar
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addStaff}
              disabled={loading || !newStaff.name || !newStaff.pin}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={() => {
                setIsAddingNew(false);
                setNewStaff({ name: '', role: 'camarero', pin: '' });
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!isAddingNew && (
        <button
          onClick={() => setIsAddingNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar Empleado
        </button>
      )}

      <div className="bg-white rounded-xl border overflow-hidden">
        {staff.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No hay empleados registrados</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PIN</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {staff.map(member => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{member.name}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_LABELS[member.role].color}`}>
                      {ROLE_LABELS[member.role].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-700">{member.pin}</td>
                  <td className="px-6 py-4 text-sm">
                    {member.is_active ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Activo</span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">Inactivo</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm flex gap-2">
                    {editingId === member.id ? (
                      <>
                        <button
                          onClick={() => updateStaff(member.id, { is_active: !member.is_active })}
                          disabled={loading}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingId(member.id)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteStaff(member.id)}
                          disabled={loading}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
