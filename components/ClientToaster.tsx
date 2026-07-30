'use client'

import { useEffect, useState } from 'react'
import { Toaster, type ToasterProps } from 'react-hot-toast'

export default function ClientToaster(props: ToasterProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return <Toaster {...props} />
}
