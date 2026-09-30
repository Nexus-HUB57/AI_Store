import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { BasePathPatch } from "@/components/base-path-patch"

// Local fonts (replaces next/font/google to avoid runtime fetch of
// fonts.googleapis.com, which breaks offline / restricted environments).
// Source: bundled copies in node_modules/next/dist/esm/next-devtools/server/font/
const geistSans = localFont({
  variable: "--font-geist-sans",
  src: [
    { path: "../../public/fonts/Geist-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/Geist-Ext.woff2", weight: "400", style: "normal" },
  ],
  display: "swap",
})

const geistMono = localFont({
  variable: "--font-geist-mono",
  src: [
    { path: "../../public/fonts/GeistMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/GeistMono-Ext.woff2", weight: "400", style: "normal" },
  ],
  display: "swap",
})

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.mybait.org/aistore'

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: {
    default: "AI Store — Nexus AI-OS | Marketplace b'AI'tcoin para Agentes AI",
    template: "%s | AI Store — Nexus AI-OS",
  },
  description: "Marketplace de 1504 agentes AI, skills executáveis e pacotes cognitivos. Moeda b'AI'tcoin (BAIT), Pulsar Energy real-time, A2A-RPC/v1, .aipkg WASM32-WASI.",
  keywords: [
    'AI Store', 'Nexus AI-OS', 'marketplace', 'agentes AI', 'bAIcoin', 'BAIT',
    'A2A-RPC', 'aipkg', 'WASM', 'Pulsar Energy', 'inteligência artificial',
    'agentes autônomos', 'skills executáveis', 'pacotes cognitivos',
    'prompt harness', 'synthetic infrastructure', 'knowledge packs',
  ],
  authors: [{ name: 'Nexus AI-OS' }],
  creator: 'Nexus AI-OS',
  publisher: 'Nexus AI-OS',
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
    apple: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: BASE_URL,
    siteName: "AI Store — Nexus AI-OS",
    title: "AI Store — Nexus AI-OS | Marketplace b'AI'tcoin para Agentes AI",
    description: "Marketplace de 1504 agentes AI, skills executáveis e pacotes cognitivos. Moeda b'AI'tcoin (BAIT), Pulsar Energy real-time, A2A-RPC/v1, .aipkg WASM32-WASI.",
    images: [
      {
        url: `https://z-cdn.chatglm.cn/z-ai/static/logo.svg`,
        width: 512,
        height: 512,
        alt: 'AI Store Nexus AI-OS',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "AI Store — Nexus AI-OS | Marketplace b'AI'tcoin",
    description: "1504 agentes AI · b'AI'tcoin (BAIT) · Pulsar Energy · A2A-RPC/v1",
    images: ['https://z-cdn.chatglm.cn/z-ai/static/logo.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  metadataBase: new URL(BASE_URL),
  alternates: {
    canonical: '/',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <BasePathPatch />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
