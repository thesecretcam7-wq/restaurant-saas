'use client'

import StoreLoadingCard from '@/components/store/StoreLoadingCard'

interface StoreLoadingScreenProps {
  color?: string
  logoUrl?: string | null
  appName?: string | null
  themeMode?: 'dark' | 'light'
}

export default function StoreLoadingScreen({ color, logoUrl, appName, themeMode }: StoreLoadingScreenProps) {
  const isLight = themeMode === 'light'

  return (
    <main className={`fixed inset-0 z-[9990] grid h-[100dvh] place-items-center overflow-hidden px-5 ${
      isLight
        ? 'bg-[linear-gradient(180deg,#ffffff_0%,#f4f4f5_58%,#e5e7eb_100%)]'
        : 'bg-[linear-gradient(180deg,#15130f,#050505_58%,#020202)]'
    }`}>
      <StoreLoadingCard color={color} logoUrl={logoUrl} appName={appName} themeMode={themeMode} />
    </main>
  )
}
