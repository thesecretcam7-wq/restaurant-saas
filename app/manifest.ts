import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Eccofood - Plataforma para restaurantes',
    short_name: 'Eccofood',
    description: 'Plataforma premium para restaurantes: TPV, pedidos QR, kiosko, cocina, delivery, reservas, inventario y pagos.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#15130f',
    theme_color: '#F97316',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '32x32',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
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
        name: 'Ver pedidos',
        short_name: 'Pedidos',
        description: 'Accede rapido a los pedidos del restaurante',
        url: '/login',
        icons: [
          {
            src: '/icons/shortcut-pedidos.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Abrir TPV',
        short_name: 'TPV',
        description: 'Entra al panel operativo de Eccofood',
        url: '/login',
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
