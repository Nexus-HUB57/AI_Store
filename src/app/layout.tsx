import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        {children}
        <Toaster />
      </body>
    </html>
  )
}