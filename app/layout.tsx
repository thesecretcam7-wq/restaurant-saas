import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

// EccoFood - Restaurant SaaS Platform

export const metadata: Metadata = {
  title: "Eccofood",
  description: "Plataforma SaaS para restaurantes: pedidos, POS, cocina, reservas y analitica.",
  applicationName: "Eccofood",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Eccofood",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    title: "Eccofood",
    description: "La plataforma todo-en-uno para restaurantes",
  },
};

export const viewport: Viewport = {
  themeColor: "#F97316",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full antialiased">
      <head>
        <link rel="icon" href="/icons/icon-192.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="min-h-full flex flex-col bg-[#f7f5f0] text-gray-900 relative overflow-x-hidden">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
