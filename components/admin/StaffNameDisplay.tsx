'use client';

import { useEffect, useState } from 'react';

export function StaffNameDisplay() {
  const [staffName, setStaffName] = useState<string | null>(null);

  useEffect(() => {
    const name = sessionStorage.getItem('staff_name');
    if (name) {
      setStaffName(name);
    }
  }, []);

  if (!staffName) return null;

  return (
    <div className="px-3 py-2 text-xs text-gray-600 border-t">
      <p className="font-medium text-gray-700">Conectado como</p>
      <p className="text-gray-600">{staffName}</p>
    </div>
  );
}
