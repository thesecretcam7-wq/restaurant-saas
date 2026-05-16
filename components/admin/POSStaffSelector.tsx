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
      <div className="rounded-xl border border-[#f6b92f]/22 bg-[#161410] p-2">
        <label className="mb-1 flex items-center gap-1 text-xs font-black text-[#fff7df]">
          <Users className="h-3.5 w-3.5 text-[#f6b92f]" />
          {label}
        </label>
        <div className="text-xs font-semibold text-[#f8f5ec]/62">Cargando camareros...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#f6b92f]/22 bg-[#161410] p-2">
      <label className="mb-1 flex items-center gap-1 text-xs font-black text-[#fff7df]">
        <Users className="h-4 w-4 text-[#f6b92f]" />
        {label}
      </label>

      {staff.length === 0 ? (
        <div className="text-xs font-semibold text-[#f8f5ec]/62">No hay camareros disponibles</div>
      ) : (
        <select
          value={selectedStaffId || ''}
          onChange={(e) => {
            const selected = staff.find((member) => member.id === e.target.value);
            if (selected) onStaffSelect(selected.id, selected.name);
          }}
          className="w-full rounded-lg border border-[#f6b92f]/28 bg-[#242016] px-2 py-2 text-xs font-bold text-[#fff7df] outline-none transition focus:border-[#f6b92f] focus:ring-2 focus:ring-[#f6b92f]/18"
        >
          <option className="bg-[#161410] text-[#fff7df]" value="">
            Seleccionar camarero...
          </option>
          {staff.map((member) => (
            <option className="bg-[#161410] text-[#fff7df]" key={member.id} value={member.id}>
              {member.name} ({member.role})
            </option>
          ))}
        </select>
      )}

      {selectedStaffId && selectedStaffStillAllowed && (
        <div className="mt-1 text-xs font-bold text-[#70f7c2]">Camarero seleccionado</div>
      )}
    </div>
  );
}
