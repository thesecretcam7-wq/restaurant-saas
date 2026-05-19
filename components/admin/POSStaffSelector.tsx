'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';

interface Staff {
  id: string;
  name: string;
  role: string;
  position: string;
}

interface POSStaffSelectorProps {
  tenantId: string;
  selectedStaffId: string | null;
  onStaffSelect: (staffId: string, name: string) => void;
  required?: boolean;
}

const ALLOWED_TABLE_ROLES = new Set(['camarero', 'comandero', 'mesero']);

function isTableStaff(member: Staff) {
  const role = String(member.role || '').trim().toLowerCase();
  const position = String(member.position || '').trim().toLowerCase();
  return ALLOWED_TABLE_ROLES.has(role) || ALLOWED_TABLE_ROLES.has(position);
}

export function POSStaffSelector({
  tenantId,
  selectedStaffId,
  onStaffSelect,
  required = false,
}: POSStaffSelectorProps) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveStaff();
  }, [tenantId]);

  useEffect(() => {
    if (!loading && selectedStaffId && !staff.some((member) => member.id === selectedStaffId)) {
      onStaffSelect('', '');
    }
  }, [loading, selectedStaffId, staff, onStaffSelect]);

  async function fetchActiveStaff() {
    try {
      const response = await fetch(`/api/staff/active?tenantId=${tenantId}&ts=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Failed to fetch staff');
      const data = await response.json();
      setStaff((data.staff || []).filter(isTableStaff));
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  }

  const label = required ? 'Camarero *' : 'Camarero';
  const selectedStaffStillAllowed = !selectedStaffId || staff.some((member) => member.id === selectedStaffId);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-2">
        <label className="mb-1 flex items-center gap-1 text-xs font-black text-slate-950">
          <Users className="h-3.5 w-3.5 text-orange-600" />
          {label}
        </label>
        <div className="text-xs font-semibold text-slate-500">Cargando camareros...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2">
      <label className="mb-1 flex items-center gap-1 text-xs font-black text-slate-950">
        <Users className="h-4 w-4 text-orange-600" />
        {label}
      </label>

      {staff.length === 0 ? (
        <div className="text-xs font-semibold text-slate-500">No hay camareros disponibles</div>
      ) : (
        <select
          value={selectedStaffId || ''}
          onChange={(e) => {
            const selected = staff.find((member) => member.id === e.target.value);
            if (selected) onStaffSelect(selected.id, selected.name);
          }}
          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        >
          <option className="bg-white text-slate-950" value="">
            Seleccionar camarero...
          </option>
          {staff.map((member) => (
            <option className="bg-white text-slate-950" key={member.id} value={member.id}>
              {member.name} ({member.role})
            </option>
          ))}
        </select>
      )}

      {selectedStaffId && selectedStaffStillAllowed && (
        <div className="mt-1 text-xs font-bold text-emerald-700">Camarero seleccionado</div>
      )}
    </div>
  );
}
