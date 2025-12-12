// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Service Monitor",
  description: "Panel para monitorizar servicios.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        <Providers>
          {/* Barra superior minimalista */}
          <header className="border-b border-slate-800/70 bg-slate-950/60 backdrop-blur sticky top-0 z-20">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-sky-600/80 flex items-center justify-center text-sm font-bold shadow-md shadow-sky-600/30">
                  SM
                </div>
                <span className="font-semibold tracking-tight">
                  Service Monitor
                </span>
              </div>
            </div>
          </header>

          {/* Contenido */}
          <main className="max-w-6xl mx-auto px-4 py-8">
            {children}
          </main>

          {/* Footer limpio */}
          <footer className="max-w-6xl mx-auto px-4 pb-6 pt-4 text-xs text-slate-500 text-center">
            © {new Date().getFullYear()} — Service Monitor
          </footer>
        </Providers>
      </body>
    </html>
  );
}
