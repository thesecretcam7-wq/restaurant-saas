'use client';

import { POSTerminal } from '@/components/admin/POSTerminal';

// Demo page with a hardcoded tenant ID for testing the fullscreen layout
export default function POSDemoPage() {
  // Use a fake UUID for demo purposes
  const demoTenantId = '00000000-0000-0000-0000-000000000001';

  return <POSTerminal tenantId={demoTenantId} />;
}
