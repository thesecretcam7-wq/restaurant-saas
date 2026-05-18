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
    <main className={`grid min-h-screen place-items-center px-5 ${
      isLight
        ? 'bg-[radial-gradient(circle_at_12%_-10%,rgba(0,229,255,0.24),transparent_24rem),radial-gradient(circle_at_90%_6%,rgba(255,0,229,0.16),transparent_22rem),radial-gradient(circle_at_52%_110%,rgba(182,255,0,0.18),transparent_24rem),linear-gradient(135deg,#ffffff,#f7fcff_54%,#ffffff)]'
        : 'bg-[linear-gradient(180deg,#15130f,#050505_58%,#020202)]'
    }`}>
      <StoreLoadingCard color={color} logoUrl={logoUrl} appName={appName} themeMode={themeMode} />
    </main>
  )
}
