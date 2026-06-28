'use client';

export type StaffClientSession = {
  tenantId: string;
  tenantSlug: string;
  staffId: string;
  staffName: string;
  role: string;
  lastPath?: string;
  savedAt: string;
};

const STORAGE_KEY = 'eccofood-staff-session';

function isBrowser() {
  return typeof window !== 'undefined';
}

function readStoredSession(): StaffClientSession | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw) as Partial<StaffClientSession>;
    if (!session.tenantId || !session.staffId || !session.staffName || !session.role) {
      return null;
    }

    return session as StaffClientSession;
  } catch {
    return null;
  }
}

export function getSavedStaffSession() {
  return readStoredSession();
}

function hydrateSessionStorage(session: StaffClientSession) {
  window.sessionStorage.setItem('staff_role', session.role);
  window.sessionStorage.setItem('staff_tenant', session.tenantId);
  window.sessionStorage.setItem('staff_name', session.staffName);
  window.sessionStorage.setItem('staff_id', session.staffId);
}

export function saveStaffSession(session: Omit<StaffClientSession, 'savedAt'>) {
  if (!isBrowser()) return;

  const next: StaffClientSession = {
    ...session,
    savedAt: new Date().toISOString(),
  };

  try {
    hydrateSessionStorage(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

export function restoreStaffSession(tenantId: string, role?: string) {
  if (!isBrowser()) return null;

  const sessionRole = window.sessionStorage.getItem('staff_role');
  const sessionTenant = window.sessionStorage.getItem('staff_tenant');
  const sessionName = window.sessionStorage.getItem('staff_name');
  const sessionStaffId = window.sessionStorage.getItem('staff_id');

  if (
    sessionTenant === tenantId &&
    sessionStaffId &&
    sessionName &&
    sessionRole &&
    (!role || sessionRole === role)
  ) {
    return readStoredSession() || {
      tenantId,
      tenantSlug: '',
      staffId: sessionStaffId,
      staffName: sessionName,
      role: sessionRole,
      savedAt: new Date().toISOString(),
    };
  }

  const stored = readStoredSession();
  if (!stored || stored.tenantId !== tenantId || (role && stored.role !== role)) {
    return null;
  }

  try {
    hydrateSessionStorage(stored);
  } catch {}

  return stored;
}

export function rememberStaffPath(tenantId: string, path: string) {
  if (!isBrowser()) return;
  const current = restoreStaffSession(tenantId);
  if (!current) return;

  saveStaffSession({
    ...current,
    lastPath: path,
  });
}

export function getStoredStaffName(tenantId?: string) {
  if (!isBrowser()) return null;
  if (tenantId) {
    return restoreStaffSession(tenantId)?.staffName || null;
  }

  return window.sessionStorage.getItem('staff_name') || readStoredSession()?.staffName || null;
}

export function clearStaffSession() {
  if (!isBrowser()) return;

  try {
    window.sessionStorage.removeItem('staff_role');
    window.sessionStorage.removeItem('staff_tenant');
    window.sessionStorage.removeItem('staff_name');
    window.sessionStorage.removeItem('staff_id');
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function isStandalonePwa() {
  if (!isBrowser()) return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}
