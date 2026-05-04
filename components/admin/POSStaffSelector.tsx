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

  async function fetchActiveStaff() {
    try {
      const response = await fetch(`/api/staff/active?tenantId=${tenantId}`);
      if (!response.ok) throw new Error('Failed to fetch staff');
      const data = await response.json();
      setStaff(data.staff || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-card rounded-lg p-2 border border-border">
        <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
          <Users className="w-3 h-3" />
          {required ? 'Camarero *' : 'Camarero'}
        </label>
        <div className="text-gray-500 text-xs">Cargando camareros...</div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-2 border border-border">
      <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
        <Users className="w-4 h-4" />
        {required ? 'Camarero *' : 'Camarero'}
      </label>

      {staff.length === 0 ? (
        <div className="text-gray-500 text-xs">No hay camareros disponibles</div>
      ) : (
        <select
          value={selectedStaffId || ''}
          onChange={(e) => {
            const selected = staff.find(s => s.id === e.target.value);
            if (selected) {
              onStaffSelect(selected.id, selected.name);
            }
          }}
          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">Seleccionar camarero...</option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name} ({member.role})
            </option>
          ))}
        </select>
      )}

      {selectedStaffId && (
        <div className="text-xs text-blue-400 mt-1">
          ✓ Camarero seleccionado
        </div>
      )}
    </div>
  );
}
