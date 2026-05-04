'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Users, Plus, Calendar, Clock, Trash2 } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  position?: string;
  hourly_rate?: number;
  is_active: boolean;
}

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  color?: string;
}

interface ShiftAssignment {
  id: string;
  staff_id: string;
  shift_id: string;
  date: string;
  status: string;
  staff?: StaffMember;
  shifts?: Shift;
}

export function StaffScheduler({ tenantId }: { tenantId: string }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'staff' | 'schedule'>('staff');
  const [showAddStaffForm, setShowAddStaffForm] = useState(false);
  const [showAddShiftForm, setShowAddShiftForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchData();
  }, [tenantId]);

  async function fetchData() {
    setLoading(true);
    try {
      const [staffRes, shiftsRes, assignmentsRes] = await Promise.all([
        fetch(`/api/staff?tenantId=${tenantId}&activeOnly=true`, { credentials: 'include' }),
        fetch(`/api/shifts?tenantId=${tenantId}`, { credentials: 'include' }),
        fetch(`/api/shifts?tenantId=${tenantId}&date=${selectedDate}`, { credentials: 'include' }),
      ]);

      if (staffRes.ok) setStaff(await staffRes.json());
      if (shiftsRes.ok) setShifts(await shiftsRes.json());
      if (assignmentsRes.ok) setAssignments(await assignmentsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addStaff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          name: formData.get('name'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          role: formData.get('role'),
          position: formData.get('position'),
          hourlyRate: parseFloat(formData.get('hourlyRate') as string),
        }),
      });

      if (!response.ok) throw new Error('Failed to add staff');

      setShowAddStaffForm(false);
      await fetchData();
    } catch (error) {
      console.error('Error adding staff:', error);
    }
  }

  async function addShift(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          name: formData.get('name'),
          startTime: formData.get('startTime'),
          endTime: formData.get('endTime'),
          color: formData.get('color'),
        }),
      });

      if (!response.ok) throw new Error('Failed to add shift');

      setShowAddShiftForm(false);
      await fetchData();
    } catch (error) {
      console.error('Error adding shift:', error);
    }
  }

  async function assignShift(staffId: string, shiftId: string) {
    try {
      const response = await fetch('/api/shifts/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          staffId,
          shiftId,
          date: selectedDate,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Error: ${error.error}`);
        return;
      }

      await fetchData();
    } catch (error) {
      console.error('Error assigning shift:', error);
    }
  }

  async function removeAssignment(assignmentId: string) {
    try {
      const response = await fetch(`/api/shifts/assign?id=${assignmentId}&tenantId=${tenantId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to remove assignment');

      await fetchData();
    } catch (error) {
      console.error('Error removing assignment:', error);
    }
  }

  if (loading) {
    return <div className="admin-empty">Cargando personal...</div>;
  }

  return (
    <div>
      <div>
        {/* Tabs */}
        <div className="admin-panel mb-5 flex gap-2 p-2">
          <button
            onClick={() => setTab('staff')}
            className={`flex-1 rounded-lg px-4 py-3 text-sm font-black transition ${
              tab === 'staff'
                ? 'bg-[#15130f] text-white'
                : 'text-black/58 hover:bg-white hover:text-[#15130f]'
            }`}
          >
            <Users className="w-5 h-5 inline mr-2" /> Personal
          </button>
          <button
            onClick={() => setTab('schedule')}
            className={`flex-1 rounded-lg px-4 py-3 text-sm font-black transition ${
              tab === 'schedule'
                ? 'bg-[#15130f] text-white'
                : 'text-black/58 hover:bg-white hover:text-[#15130f]'
            }`}
          >
            <Calendar className="w-5 h-5 inline mr-2" /> Horarios
          </button>
        </div>

        {/* Staff Tab */}
        {tab === 'staff' && (
          <div>
            <button
              onClick={() => setShowAddStaffForm(true)}
              className="admin-button-primary mb-5"
            >
              <Plus className="w-5 h-5" /> Agregar Empleado
            </button>

            {showAddStaffForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="admin-panel max-w-md w-full mx-4 p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Agregar Empleado</h2>
                  <form onSubmit={addStaff} className="space-y-4">
                    <input
                      type="text"
                      name="name"
                      placeholder="Nombre"
                      required
                      className="admin-input"
                    />
                    <input
                      type="email"
                      name="email"
                      placeholder="Email"
                      required
                      className="admin-input"
                    />
                    <input
                      type="tel"
                      name="phone"
                      placeholder="Teléfono"
                      className="admin-input"
                    />
                    <select
                      name="role"
                      required
                      className="admin-input"
                    >
                      <option value="">Seleccionar Rol</option>
                      <option value="manager">Manager</option>
                      <option value="waiter">Mesero</option>
                      <option value="chef">Chef</option>
                      <option value="bartender">Bartender</option>
                      <option value="cashier">Cajero</option>
                      <option value="kitchen_prep">Auxiliar de Cocina</option>
                    </select>
                    <input
                      type="text"
                      name="position"
                      placeholder="Puesto (opcional)"
                      className="admin-input"
                    />
                    <input
                      type="number"
                      step="0.01"
                      name="hourlyRate"
                      placeholder="Tarifa Horaria"
                      className="admin-input"
                    />
                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        className="admin-button-primary flex-1"
                      >
                        Agregar
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddStaffForm(false)}
                        className="admin-button-ghost flex-1"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="grid gap-4">
              {staff.map((member) => (
                <div key={member.id} className="admin-card p-5">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900">{member.name}</h3>
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold capitalize">{member.role}</span>
                        {member.position && ` • ${member.position}`}
                      </p>
                      <p className="text-sm text-gray-600">{member.email}</p>
                      {member.hourly_rate && (
                        <p className="text-sm text-gray-600 mt-2">
                          Tarifa: ${member.hourly_rate.toFixed(2)}/hora
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      member.is_active
                        ? 'bg-green-100 text-green-900'
                        : 'bg-red-100 text-red-900'
                    }`}>
                      {member.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {tab === 'schedule' && (
          <div>
            <div className="flex gap-4 mb-8">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    fetchData();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button
                onClick={() => setShowAddShiftForm(true)}
                className="admin-button-primary self-end"
              >
                <Plus className="w-5 h-5" /> Agregar Turno
              </button>
            </div>

            {showAddShiftForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="admin-panel max-w-md w-full mx-4 p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Agregar Turno</h2>
                  <form onSubmit={addShift} className="space-y-4">
                    <input
                      type="text"
                      name="name"
                      placeholder="Nombre del Turno"
                      required
                      className="admin-input"
                    />
                    <input
                      type="time"
                      name="startTime"
                      placeholder="Hora Inicio"
                      required
                      className="admin-input"
                    />
                    <input
                      type="time"
                      name="endTime"
                      placeholder="Hora Fin"
                      required
                      className="admin-input"
                    />
                    <input
                      type="color"
                      name="color"
                      defaultValue="#3B82F6"
                      className="admin-input"
                    />
                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        className="admin-button-primary flex-1"
                      >
                        Agregar
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddShiftForm(false)}
                        className="admin-button-ghost flex-1"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Schedule Grid */}
            <div className="admin-panel overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {staff.map((member) => (
                  <div key={member.id} className="admin-card p-4">
                    <h3 className="font-bold text-gray-900 mb-4">{member.name}</h3>
                    <div className="space-y-2 mb-4">
                      {assignments
                        .filter((a) => a.staff_id === member.id)
                        .map((assignment) => (
                          <div
                            key={assignment.id}
                            className="bg-blue-50 border border-blue-200 rounded p-3 flex justify-between items-start"
                          >
                            <div>
                              <p className="font-semibold text-gray-900">
                                {assignment.shifts?.name}
                              </p>
                              <p className="text-sm text-gray-600">
                                <Clock className="w-4 h-4 inline mr-1" />
                                {assignment.shifts?.start_time} - {assignment.shifts?.end_time}
                              </p>
                            </div>
                            <button
                              onClick={() => removeAssignment(assignment.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                    </div>
                    <div className="border-t pt-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Agregar Turno:</p>
                      <div className="space-y-2">
                        {shifts.map((shift) => (
                          <button
                            key={shift.id}
                            onClick={() => assignShift(member.id, shift.id)}
                            className="w-full text-left px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm transition"
                          >
                            {shift.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
