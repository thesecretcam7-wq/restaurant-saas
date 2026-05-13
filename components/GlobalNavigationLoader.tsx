'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import EccofoodLogo from '@/components/EccofoodLogo';

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

function isCustomDomainHost() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return false;
  if (host === 'eccofoodapp.com' || host === 'www.eccofoodapp.com') return false;
  if (host === 'eccofood.vercel.app') return false;
  if (host.endsWith('.eccofoodapp.com') || host.endsWith('.vercel.app')) return false;
  return host.includes('.');
}

function isStoreRoute(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'api' || parts[0] === '_next') return false;

  if (isTenantSubdomainHost() || isCustomDomainHost()) {
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
      if (isStoreRoute(window.location.pathname)) return;
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
      if (isStoreRoute(window.location.pathname) || isStoreRoute(action.pathname)) return;
      show(action.pathname, 'Procesando solicitud');
    }

    function handleBeforeUnload() {
      if (isStoreRoute(window.location.pathname)) return;
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
    <div className="ecco-global-loader">
      <div className="ecco-global-loader-progress">
        <div className="ecco-global-loader-progress-bar" />
      </div>

      <div className="ecco-global-loader-card">
        <div className="ecco-global-loader-logo">
          <EccofoodLogo size="md" showText={false} />
        </div>
        <p className="ecco-global-loader-brand">Eccofood</p>
        <h2 className="ecco-global-loader-title">{label}</h2>
        <div className="ecco-global-loader-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
