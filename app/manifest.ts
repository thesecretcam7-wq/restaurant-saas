import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Restaurant.SV - Gestión Profesional',
    short_name: 'Restaurant.SV',
    description: 'Plataforma completa para gestionar tu restaurante: pedidos, menú, pagos, reservas y análisis',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0A0A0A',
    theme_color: '#F97316',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['food', 'business', 'productivity', 'shopping'],
    screenshots: [
      {
        src: '/screenshots/admin-dashboard.png',
        sizes: '540x720',
        form_factor: 'narrow',
        type: 'image/png',
      },
      {
        src: '/screenshots/admin-desktop.png',
        sizes: '1280x720',
        form_factor: 'wide',
        type: 'image/png',
      },
    ],
    prefer_related_applications: false,
    shortcuts: [
      {
        name: 'Ver Pedidos',
        short_name: 'Pedidos',
        description: 'Accede rápidamente a tus pedidos',
        url: '/[domain]/admin/pedidos',
        icons: [
          {
            src: '/icons/shortcut-pedidos.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Agregar Producto',
        short_name: 'Nuevo Producto',
        description: 'Crea un nuevo producto rápidamente',
        url: '/[domain]/admin/productos/nuevo',
        icons: [
          {
            src: '/icons/shortcut-producto.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
    ],
  }
}
