'use client'

import { useState } from 'react'
import type { GalleryConfig } from '@/lib/pageConfig'

interface Props {
  gallery: GalleryConfig
  title: string
  borderRadius: string
}

export default function GallerySection({ gallery, title, borderRadius }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  if (!gallery.images.length) return null

  return (
    <section className="px-4 pt-4 pb-2">
      <h3 className="font-bold text-gray-900 text-lg mb-3">{title}</h3>

      {gallery.style === 'carousel' ? (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {gallery.images.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelectedIndex(i)}
              className="flex-shrink-0 w-56 h-40 overflow-hidden active:scale-[0.97] transition-transform"
              style={{ borderRadius }}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      ) : gallery.style === 'masonry' ? (
        <div className="columns-2 gap-3 space-y-3">
          {gallery.images.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelectedIndex(i)}
              className="w-full overflow-hidden break-inside-avoid active:scale-[0.97] transition-transform"
              style={{ borderRadius }}
            >
              <img src={img} alt="" className="w-full object-cover" />
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {gallery.images.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelectedIndex(i)}
              className="aspect-square overflow-hidden active:scale-[0.97] transition-transform"
              style={{ borderRadius }}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedIndex(null)}
        >
          <button className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl font-light z-10">×</button>
          <img
            src={gallery.images[selectedIndex]}
            alt=""
            className="max-w-full max-h-[85vh] object-contain rounded-2xl"
            onClick={e => e.stopPropagation()}
          />
          {gallery.images.length > 1 && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
              {gallery.images.map((_, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); setSelectedIndex(i) }}
                  className={`w-2 h-2 rounded-full transition-all ${i === selectedIndex ? 'bg-white w-6' : 'bg-white/40'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
