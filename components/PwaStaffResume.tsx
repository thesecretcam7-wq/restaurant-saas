'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSavedStaffSession, isStandalonePwa } from '@/lib/staff-session-client';

export function PwaStaffResume() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isStandalonePwa()) return;

    const session = getSavedStaffSession();
    const lastPath = session?.lastPath;
    if (!lastPath || !lastPath.startsWith('/') || lastPath.startsWith('//')) return;
    if (pathname === lastPath) return;

    router.replace(lastPath);
  }, [pathname, router]);

  return null;
}
