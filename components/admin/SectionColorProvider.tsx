'use client'

import { usePathname } from 'next/navigation'
import { detectAdminSection, getSectionColorVar } from '@/lib/colors'

interface Props {
  children: React.ReactNode
}

export function SectionColorProvider({ children }: Props) {
  const pathname = usePathname()
  const section = detectAdminSection(pathname)
  const sectionColorVar = getSectionColorVar(section)

  return (
    <>
      <style>{`
        :root {
          --section-color: var(${sectionColorVar});
          --section-color-10: color-mix(in srgb, var(${sectionColorVar}) 10%, white);
          --section-color-20: color-mix(in srgb, var(${sectionColorVar}) 20%, white);
          --section-color-hover: color-mix(in srgb, var(${sectionColorVar}) 90%, black);
        }
      `}</style>
      {children}
    </>
  )
}
