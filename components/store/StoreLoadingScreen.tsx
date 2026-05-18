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
        ? 'bg-[radial-gradient(circle_at_12%_-10%,rgba(249,115,22,0.20),transparent_24rem),radial-gradient(circle_at_90%_6%,rgba(20,184,166,0.14),transparent_22rem),linear-gradient(135deg,#fffaf0,#fff7e8_54%,#ffe8c2)]'
        : 'bg-[linear-gradient(180deg,#15130f,#050505_58%,#020202)]'
    }`}>
      <StoreLoadingCard color={color} logoUrl={logoUrl} appName={appName} themeMode={themeMode} />
    </main>
  )
}
