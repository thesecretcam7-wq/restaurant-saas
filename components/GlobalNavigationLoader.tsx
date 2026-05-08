'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

const APP_SECTIONS = new Set([
  'acceso',
  'admin',
  'staff',
  'kitchen',
  'cocina',
  'pantalla',
  'pos-display',
  'kiosko',
]);

const ROOT_APP_ROUTES = new Set([
  '',
  'login',
  'register',
  'planes',
  'gestionar-cuentas',
  'owner-dashboard',
  'unauthorized',
]);

function isTenantSubdomainHost() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return false;
  if (host === 'eccofoodapp.com' || host === 'www.eccofoodapp.com') return false;
  if (host === 'eccofood.vercel.app') return false;
  return host.endsWith('.eccofoodapp.com') || host.endsWith('.vercel.app');
}

function isStoreRoute(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'api' || parts[0] === '_next') return false;

  if (isTenantSubdomainHost()) {
    return !APP_SECTIONS.has(parts[0] || '');
  }

  const first = parts[0] || '';
  if (ROOT_APP_ROUTES.has(first) || first.includes('.')) return false;
  const section = parts[1] || '';
  return !APP_SECTIONS.has(section);
}

function getLoadingLabel(pathname: string) {
  if (pathname.includes('/acceso')) return 'Cargando acceso';
  if (pathname.includes('/admin/pos') || pathname.includes('/staff/pos')) return 'Abriendo TPV';
  if (pathname.includes('/kds') || pathname.includes('/cocina')) return 'Preparando cocina';
  if (pathname.includes('/kitchen')) return 'Abriendo comandero';
  if (pathname.includes('/kiosko')) return 'Preparando kiosko';
  if (pathname.includes('/pantalla') || pathname.includes('/pos-display')) return 'Activando pantalla';
  if (pathname.includes('/admin')) return 'Abriendo panel';
  return 'Cargando Eccofood';
}

function isInternalNavigation(anchor: HTMLAnchorElement) {
  if (anchor.target && anchor.target !== '_self') return false;
  if (anchor.hasAttribute('download')) return false;

  const href = anchor.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;

  try {
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    const current = new URL(window.location.href);
    return url.pathname !== current.pathname || url.search !== current.search;
  } catch {
    return false;
  }
}

export default function GlobalNavigationLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState('Cargando Eccofood');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setVisible(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, [pathname]);

  useEffect(() => {
    function show(nextPathname: string, fallbackLabel = 'Procesando solicitud') {
      setLabel(nextPathname ? getLoadingLabel(nextPathname) : fallbackLabel);
      setVisible(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setVisible(false), 12000);
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as Element | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor || !isInternalNavigation(anchor)) return;
      const url = new URL(anchor.href, window.location.href);
      if (isStoreRoute(window.location.pathname) || isStoreRoute(url.pathname)) return;
      show(url.pathname);
    }

    function handleSubmit(event: SubmitEvent) {
      if (event.defaultPrevented) return;
      const form = event.target as HTMLFormElement | null;
      if (!form || form.method.toLowerCase() !== 'get') return;
      const action = form.action ? new URL(form.action, window.location.href) : new URL(window.location.href);
      if (action.origin !== window.location.origin) return;
      show(action.pathname, 'Procesando solicitud');
    }

    function handleBeforeUnload() {
      show(window.location.pathname, 'Cargando Eccofood');
    }

    document.addEventListener('click', handleClick, true);
    document.addEventListener('submit', handleSubmit, true);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('submit', handleSubmit, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[10000] grid place-items-center bg-[#070707]/45 px-5 text-[#17120d] backdrop-blur-md">
      <div className="absolute left-0 top-0 h-1 w-full overflow-hidden bg-white/20">
        <div className="h-full w-1/2 animate-[eccoGlobalLoaderBar_1.05s_ease-in-out_infinite] rounded-r-full bg-[#f97316]" />
      </div>

      <div className="w-full max-w-sm rounded-[2rem] border border-white/70 bg-white/92 p-7 text-center shadow-[0_30px_90px_rgba(0,0,0,0.22)]">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-3xl bg-[#111111] shadow-[0_18px_45px_rgba(249,115,22,0.32)]">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f97316] text-2xl font-black text-white">E</div>
        </div>
        <p className="text-xs font-black uppercase tracking-[0.26em] text-[#f97316]">Eccofood</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">{label}</h2>
        <div className="mx-auto mt-5 flex w-fit items-center gap-2">
          <span className="h-2.5 w-2.5 animate-[eccoGlobalLoaderDot_0.9s_ease-in-out_infinite] rounded-full bg-[#f97316]" />
          <span className="h-2.5 w-2.5 animate-[eccoGlobalLoaderDot_0.9s_ease-in-out_0.14s_infinite] rounded-full bg-[#f97316]" />
          <span className="h-2.5 w-2.5 animate-[eccoGlobalLoaderDot_0.9s_ease-in-out_0.28s_infinite] rounded-full bg-[#f97316]" />
        </div>
      </div>
    </div>
  );
}
