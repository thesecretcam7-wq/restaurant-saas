import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

// EccoFood - Restaurant SaaS Platform

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Restaurant.SV",
  description: "Gestiona tu restaurante desde cualquier dispositivo",
  applicationName: "Restaurant.SV",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Restaurant.SV",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    title: "Restaurant.SV",
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
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <head>
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="min-h-full flex flex-col">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
