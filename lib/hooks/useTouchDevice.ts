'use client'

import { useEffect, useState } from 'react'

export function useTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    const detectTouch = () => {
      const hasTouchPoints = navigator.maxTouchPoints > 0
      const hasCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches
      setIsTouchDevice(hasTouchPoints || Boolean(hasCoarsePointer))
    }

    detectTouch()
    window.addEventListener('resize', detectTouch)
    return () => window.removeEventListener('resize', detectTouch)
  }, [])

  return isTouchDevice
}
