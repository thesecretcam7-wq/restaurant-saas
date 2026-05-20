'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, ChefHat, RotateCcw } from 'lucide-react'

const TENANT_KEY = 'eccofood_android_tenant_slug'

function cleanSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.eccofoodapp\.com$/, '')
    .replace(/[^a-z0-9-]/g, '')
}

export default function AndroidStartClient() {
  const [slug, setSlug] = useState('')
  const [savedSlug, setSavedSlug] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const saved = cleanSlug(localStorage.getItem(TENANT_KEY) || '')
    if (saved) {
      setSavedSlug(saved)
      setSlug(saved)
      window.location.replace(`/${saved}/acceso`)
    }
  }, [])

  function openAccess(nextSlug: string) {
    const cleaned = cleanSlug(nextSlug)
    if (!cleaned) {
      setError('Escribe el codigo del restaurante.')
      return
    }
    localStorage.setItem(TENANT_KEY, cleaned)
    window.location.href = `/${cleaned}/acceso`
  }

  function resetRestaurant() {
    localStorage.removeItem(TENANT_KEY)
    setSavedSlug('')
    setSlug('')
    setError('')
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#0B0E14] px-5 text-white">
      <section className="w-full max-w-md rounded-[2rem] border border-[#D4AF37]/20 bg-[#1A1F2C]/90 p-6 shadow-[0_30px_110px_rgba(0,0,0,0.35)]">
        <div className="mb-7 flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl border border-[#D4AF37]/25 bg-[#0B0E14] text-[#D4AF37]">
            <ChefHat className="size-7" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#D4AF37]">Eccofood Android</p>
            <h1 className="text-2xl font-black tracking-tight">Acceso TPV</h1>
          </div>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-black text-[#8b97a8]">Codigo del restaurante</span>
          <input
            value={slug}
            onChange={(event) => {
              setSlug(event.target.value)
              setError('')
            }}
            autoCapitalize="none"
            autoCorrect="off"
            inputMode="text"
            placeholder="peoplepizza"
            className="h-14 w-full rounded-2xl border border-[#D4AF37]/20 bg-[#0B0E14]/70 px-4 text-lg font-black text-white outline-none transition placeholder:text-[#8b97a8] focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/10"
          />
        </label>

        {error && (
          <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-700">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => openAccess(slug)}
          className="mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#D35A37] text-base font-black text-white shadow-[0_16px_34px_rgba(211,90,55,0.24)] transition active:scale-[0.98]"
        >
          Entrar al restaurante
          <ArrowRight className="size-5" />
        </button>

        {savedSlug && (
          <button
            type="button"
            onClick={resetRestaurant}
            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#D4AF37]/20 text-xs font-black uppercase tracking-[0.16em] text-[#D4AF37]"
          >
            <RotateCcw className="size-4" />
            Cambiar restaurante
          </button>
        )}

        <p className="mt-5 text-center text-xs font-semibold leading-5 text-[#8b97a8]">
          Es el mismo nombre que aparece en la URL del restaurante.
        </p>
      </section>
    </main>
  )
}
