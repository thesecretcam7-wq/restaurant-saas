'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

type OperationalScreen = {
  screen: 'waiter' | 'deliveries' | 'waiterAccess' | 'cashier';
  title: string;
};

function getOperationalScreen(pathname: string, tenantSlug: string, restaurantName: string): OperationalScreen | null {
  const base = `/${tenantSlug}`;

  if (pathname === `${base}/kitchen` || pathname.startsWith(`${base}/kitchen/`)) {
    return {
      screen: 'waiter',
      title: `${restaurantName} Camarero`,
    };
  }

  if (pathname === `${base}/staff/entregas` || pathname.startsWith(`${base}/staff/entregas/`)) {
    return {
      screen: 'deliveries',
      title: `${restaurantName} Entregas`,
    };
  }

  if (
    pathname === `${base}/staff/pos` ||
    pathname.startsWith(`${base}/staff/pos/`) ||
    pathname === `${base}/admin/pos` ||
    pathname.startsWith(`${base}/admin/pos/`)
  ) {
    return {
      screen: 'cashier',
      title: `${restaurantName} TPV`,
    };
  }

  if (pathname === `${base}/acceso/apk/camarero` || pathname.startsWith(`${base}/acceso/apk/camarero/`)) {
    return {
      screen: 'waiterAccess',
      title: `${restaurantName} Camarero`,
    };
  }

  return null;
}

function upsertMeta(name: string, content: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
}

export default function TenantPwaManifestLink({
  tenantSlug,
  restaurantName,
}: {
  tenantSlug: string;
  restaurantName: string;
}) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    const operationalScreen = getOperationalScreen(pathname, tenantSlug, restaurantName);
    const manifestHref = operationalScreen
      ? `/${tenantSlug}/manifest.webmanifest?screen=${operationalScreen.screen}`
      : `/${tenantSlug}/manifest.webmanifest`;

    let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = manifestHref;

    if (operationalScreen) {
      document.title = operationalScreen.title;
      upsertMeta('apple-mobile-web-app-title', operationalScreen.title);
      upsertMeta('mobile-web-app-capable', 'yes');
      upsertMeta('apple-mobile-web-app-capable', 'yes');
    } else {
      upsertMeta('apple-mobile-web-app-title', restaurantName);
    }
  }, [pathname, restaurantName, tenantSlug]);

  return null;
}
