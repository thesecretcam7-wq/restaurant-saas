'use client';

import { X } from 'lucide-react';
import Link from 'next/link';

interface NavLink {
  href: string;
  label: string;
  icon: string;
}

interface AdminMenuDrawerProps {
  isOpen: boolean;
  tenantId: string;
  navLinks: NavLink[];
  onClose: () => void;
}

export function AdminMenuDrawer({
  isOpen,
  tenantId,
  navLinks,
  onClose,
}: AdminMenuDrawerProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-gray-900 border-r border-gray-700 flex flex-col z-50 transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3 flex-shrink-0">
          <h2 className="text-lg font-bold text-white">Panel Admin</h2>
          <button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 text-white rounded p-1.5 transition"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition"
            >
              <span className="text-lg">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-700 p-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium text-sm transition"
          >
            Volver al TPV
          </button>
        </div>
      </div>
    </>
  );
}
