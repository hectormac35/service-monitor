// app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";
import { API_BASE_URL } from "@/lib/api";

const GRAFANA_URL = process.env.NEXT_PUBLIC_GRAFANA_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: "Service Monitor",
  description: "Panel para monitorizar servicios HTTP.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" translate="no">
      <body className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 antialiased">
        <Providers>
          <header className="border-b border-slate-800/70 bg-slate-950/60 backdrop-blur sticky top-0 z-20">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-sky-600/80 flex items-center justify-center text-sm font-bold shadow-md shadow-sky-600/30">
                  SM
                </div>
                <span className="font-semibold tracking-tight">Service Monitor</span>
              </Link>
              <nav className="flex items-center gap-4 text-xs text-slate-400">
                <a href={`${API_BASE_URL}/docs`} target="_blank" rel="noreferrer" className="hover:text-sky-300">
                  API
                </a>
                <a href={GRAFANA_URL} target="_blank" rel="noreferrer" className="hover:text-sky-300">
                  Grafana
                </a>
              </nav>
            </div>
          </header>

          <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>

          <footer className="max-w-6xl mx-auto px-4 pb-6 pt-4 text-xs text-slate-500 text-center">
            Service Monitor · FastAPI · Next.js · Prometheus · Grafana
          </footer>
        </Providers>
      </body>
    </html>
  );
}
