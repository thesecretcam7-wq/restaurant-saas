'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  role: 'cocinero' | 'camarero' | 'cajero' | 'admin';
  pin: string;
  is_active: boolean;
  created_at: string;
}

interface Props {
  tenantId: string;
  initialStaff: StaffMember[];
}

type StaffForm = Pick<StaffMember, 'name' | 'role' | 'pin' | 'is_active'>;

const ROLE_LABELS = {
  cocinero: { label: 'Cocinero', color: 'bg-orange-100 text-orange-700' },
  camarero: { label: 'Camarero', color: 'bg-emerald-100 text-emerald-700' },
  cajero: { label: 'Cajero', color: 'bg-indigo-100 text-indigo-700' },
  admin: { label: 'Administrador', color: 'bg-purple-100 text-purple-700' },
};

const ROLE_OPTIONS: Array<{ value: StaffMember['role']; label: string }> = [
  { value: 'cocinero', label: 'Cocinero' },
  { value: 'camarero', label: 'Camarero' },
  { value: 'cajero', label: 'Cajero' },
  { value: 'admin', label: 'Administrador' },
];

const emptyEditForm: StaffForm = {
  name: '',
  role: 'camarero',
  pin: '',
  is_active: true,
};

function createPin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function StaffManagement({ tenantId, initialStaff }: Props) {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newStaff, setNewStaff] = useState<Pick<StaffForm, 'name' | 'role' | 'pin'>>({
    name: '',
    role: 'camarero',
    pin: '',
  });
  const [editStaff, setEditStaff] = useState<StaffForm>(emptyEditForm);
  const [loading, setLoading] = useState(false);

  function validateStaffForm(form: Pick<StaffForm, 'name' | 'pin'>) {
    if (!form.name.trim()) {
      toast.error('Escribe el nombre del empleado');
      return false;
    }

    if (!/^\d{6}$/.test(form.pin.trim())) {
      toast.error('El PIN debe tener 6 numeros');
      return false;
    }

    return true;
  }

  function startEditing(member: StaffMember) {
    setEditingId(member.id);
    setEditStaff({
      name: member.name,
      role: member.role,
      pin: member.pin,
      is_active: member.is_active,
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setEditStaff(emptyEditForm);
  }

  async function addStaff() {
    if (!validateStaffForm(newStaff)) return;

    setLoading(true);
    try {
      const res = await fetch('/api/staff/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          name: newStaff.name.trim(),
          role: newStaff.role,
          pin: newStaff.pin.trim(),
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(data?.error || 'No se pudo crear el empleado');
        return;
      }

      setStaff(prev => [data.staff, ...prev]);
      setNewStaff({ name: '', role: 'camarero', pin: '' });
      setIsAddingNew(false);
      toast.success('Empleado creado');
    } finally {
      setLoading(false);
    }
  }

  async function updateStaff(id: string, updates: StaffForm) {
    setLoading(true);
    try {
      const res = await fetch('/api/staff/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(data?.error || 'No se pudo actualizar el empleado');
        return;
      }

      setStaff(prev => prev.map(s => (s.id === id ? data.staff : s)));
      cancelEditing();
      toast.success('Empleado actualizado');
    } finally {
      setLoading(false);
    }
  }

  async function saveEdit(id: string) {
    if (!validateStaffForm(editStaff)) return;

    await updateStaff(id, {
      name: editStaff.name.trim(),
      role: editStaff.role,
      pin: editStaff.pin.trim(),
      is_active: editStaff.is_active,
    });
  }

  async function deleteStaff(id: string) {
    if (!confirm('Eliminar este empleado?')) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/staff/members?id=${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(data?.error || 'No se pudo eliminar el empleado');
        return;
      }

      setStaff(prev => prev.filter(s => s.id !== id));
      toast.success('Empleado eliminado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {isAddingNew && (
        <div className="space-y-4 rounded-xl border bg-white p-4 sm:p-6">
          <h2 className="font-semibold text-gray-900">Nuevo empleado</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <input
              type="text"
              placeholder="Nombre"
              value={newStaff.name}
              onChange={e => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
              className="rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
            <select
              value={newStaff.role}
              onChange={e => setNewStaff(prev => ({ ...prev, role: e.target.value as StaffMember['role'] }))}
              className="rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
              {ROLE_OPTIONS.filter(option => option.value !== 'admin').map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="PIN"
                value={newStaff.pin}
                onChange={e => setNewStaff(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '') }))}
                className="min-w-0 flex-1 rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={() => setNewStaff(prev => ({ ...prev, pin: createPin() }))}
                disabled={loading}
                className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-200"
              >
                Generar
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={addStaff}
              disabled={loading || !newStaff.name.trim() || !newStaff.pin.trim()}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={() => {
                setIsAddingNew(false);
                setNewStaff({ name: '', role: 'camarero', pin: '' });
              }}
              className="rounded-lg bg-gray-100 px-4 py-2 font-medium transition-colors hover:bg-gray-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!isAddingNew && (
        <button
          onClick={() => {
            cancelEditing();
            setIsAddingNew(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Agregar empleado
        </button>
      )}

      <div className="overflow-hidden overflow-x-auto rounded-xl border bg-white">
        {staff.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No hay empleados registrados</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">PIN</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {staff.map(member => {
                const isEditing = editingId === member.id;

                return (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="min-w-[180px] px-6 py-4 text-sm font-medium text-gray-900">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editStaff.name}
                          onChange={e => setEditStaff(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                        />
                      ) : (
                        member.name
                      )}
                    </td>
                    <td className="min-w-[160px] px-6 py-4 text-sm">
                      {isEditing ? (
                        <select
                          value={editStaff.role}
                          onChange={e => setEditStaff(prev => ({ ...prev, role: e.target.value as StaffMember['role'] }))}
                          className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                        >
                          {ROLE_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${ROLE_LABELS[member.role].color}`}>
                          {ROLE_LABELS[member.role].label}
                        </span>
                      )}
                    </td>
                    <td className="min-w-[190px] px-6 py-4 font-mono text-sm text-gray-700">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={editStaff.pin}
                            onChange={e => setEditStaff(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '') }))}
                            className="w-24 rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                          />
                          <button
                            onClick={() => setEditStaff(prev => ({ ...prev, pin: createPin() }))}
                            disabled={loading}
                            className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium transition-colors hover:bg-gray-200"
                          >
                            Generar
                          </button>
                        </div>
                      ) : (
                        member.pin
                      )}
                    </td>
                    <td className="min-w-[140px] px-6 py-4 text-sm">
                      {isEditing ? (
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={editStaff.is_active}
                            onChange={e => setEditStaff(prev => ({ ...prev, is_active: e.target.checked }))}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          Activo
                        </label>
                      ) : member.is_active ? (
                        <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">Activo</span>
                      ) : (
                        <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">Inactivo</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(member.id)}
                              disabled={loading}
                              className="rounded p-1 text-green-600 hover:bg-green-50"
                              title="Guardar cambios"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="rounded p-1 text-gray-600 hover:bg-gray-100"
                              title="Cancelar"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditing(member)}
                              className="rounded p-1 text-blue-600 hover:bg-blue-50"
                              title="Editar empleado"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteStaff(member.id)}
                              disabled={loading}
                              className="rounded p-1 text-red-600 hover:bg-red-50"
                              title="Eliminar empleado"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
