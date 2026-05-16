'use client'

import StoreLoadingCard from '@/components/store/StoreLoadingCard'

interface StoreLoadingScreenProps {
  color?: string
  logoUrl?: string | null
  appName?: string | null
}

export default function StoreLoadingScreen({ color, logoUrl, appName }: StoreLoadingScreenProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(180deg,#15130f,#050505_58%,#020202)] px-5">
      <StoreLoadingCard color={color} logoUrl={logoUrl} appName={appName} />
    </main>
  )
}
