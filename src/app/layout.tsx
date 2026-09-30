import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { BasePathPatch } from "@/components/base-path-patch"

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

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.mybait.org/aistore"

/**
 * Synchronous basePath polyfill injected into <head> BEFORE any React/hydration.
 * Fixes production "Erro Inesperado" when client code does fetch("/api/stats")
 * under next.config basePath=/aistore (absolute /api hits domain root → 404 HTML
 * → JSON parse / render crash → error boundary).
 */
const EARLY_BASEPATH_SCRIPT = `
(function(){
  try {
    var BASE = ${JSON.stringify(process.env.NEXT_PUBLIC_BASE_PATH || "/aistore")};
    if (!BASE || BASE === "/") BASE = "/aistore";
    if (BASE.charAt(BASE.length-1) === "/") BASE = BASE.slice(0,-1);
    function withBase(u) {
      if (typeof u !== "string" || u.charAt(0) !== "/") return u;
      if (u === BASE || u.indexOf(BASE + "/") === 0) return u;
      if (u.indexOf("/api/") === 0 || u === "/api" || u.indexOf("/_next/") === 0 || u === "/manifest.webmanifest")
        return BASE + u;
      return u;
    }
    if (typeof window !== "undefined" && !window.__BAIT_BASEPATH_PATCHED__) {
      window.__BAIT_BASEPATH_PATCHED__ = true;
      var of = window.fetch.bind(window);
      window.fetch = function(input, init) {
        if (typeof input === "string") return of(withBase(input), init);
        try {
          if (input && typeof Request !== "undefined" && input instanceof Request) {
            var u = new URL(input.url, location.origin);
            if (u.origin === location.origin) {
              return of(new Request(withBase(u.pathname + u.search + u.hash), input), init);
            }
          }
        } catch (e) {}
        return of(input, init);
      };
      var OE = window.EventSource;
      window.EventSource = function(url, opts) {
        var s = typeof url === "string" ? withBase(url) : url;
        return new OE(s, opts);
      };
      window.EventSource.prototype = OE.prototype;
      window.EventSource.CONNECTING = OE.CONNECTING;
      window.EventSource.OPEN = OE.OPEN;
      window.EventSource.CLOSED = OE.CLOSED;
    }
  } catch (e) { /* never block boot */ }
})();
`.trim()

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: {
    default: "AI Store — Nexus AI-OS | Marketplace b'AI'tcoin para Agentes AI",
    template: "%s | AI Store — Nexus AI-OS",
  },
  description:
    "Marketplace de 1504 agentes AI, skills executáveis e pacotes cognitivos. Moeda b'AI'tcoin (BAIT), Pulsar Energy real-time, A2A-RPC/v1, .aipkg WASM32-WASI.",
  keywords: [
    "AI Store",
    "Nexus AI-OS",
    "marketplace",
    "agentes AI",
    "bAIcoin",
    "BAIT",
    "A2A-RPC",
    "aipkg",
    "WASM",
    "Pulsar Energy",
  ],
  authors: [{ name: "Nexus AI-OS" }],
  creator: "Nexus AI-OS",
  publisher: "Nexus AI-OS",
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
    apple: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: BASE_URL,
    siteName: "AI Store — Nexus AI-OS",
    title: "AI Store — Nexus AI-OS | Marketplace b'AI'tcoin para Agentes AI",
    description:
      "Marketplace de 1504 agentes AI, skills executáveis e pacotes cognitivos.",
    images: [
      {
        url: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
        width: 512,
        height: 512,
        alt: "AI Store Nexus AI-OS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Store — Nexus AI-OS | Marketplace b'AI'tcoin",
    description: "1504 agentes AI · b'AI'tcoin (BAIT) · Pulsar Energy · A2A-RPC/v1",
    images: ["https://z-cdn.chatglm.cn/z-ai/static/logo.svg"],
  },
  robots: { index: true, follow: true },
  metadataBase: new URL(BASE_URL),
  alternates: { canonical: "/" },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          // Synchronous: runs before any module / React hydration
          dangerouslySetInnerHTML={{ __html: EARLY_BASEPATH_SCRIPT }}
        />
      </head>
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
