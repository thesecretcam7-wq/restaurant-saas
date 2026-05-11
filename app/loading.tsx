import RouteAwarePageLoader from '@/components/RouteAwarePageLoader';
import { headers } from 'next/headers';

function titleFromHost(host: string) {
  return (host.split('.')[0] || 'Restaurante')
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Restaurante';
}

function isCustomDomainHost(host: string) {
  if (!host || host === 'localhost' || host === '127.0.0.1') return false;
  if (host === 'eccofoodapp.com' || host === 'www.eccofoodapp.com') return false;
  if (host === 'eccofood.vercel.app') return false;
  if (host.endsWith('.eccofoodapp.com') || host.endsWith('.vercel.app')) return false;
  return host.includes('.');
}

export default async function Loading() {
  const headersList = await headers();
  const host = (headersList.get('host') || '').split(':')[0]?.toLowerCase() || '';
  const routeKind = headersList.get('x-eccofood-route-kind') || '';
  const tenantSlug = headersList.get('x-eccofood-tenant-slug') || '';
  const isCustomStore = isCustomDomainHost(host);
  const isStore = isCustomStore || routeKind === 'store';
  const fallbackName = isCustomStore ? titleFromHost(host) : tenantSlug || 'Restaurante';

  return (
    <RouteAwarePageLoader
      initialIsStore={isStore}
      initialFallbackName={fallbackName}
    />
  );
}
