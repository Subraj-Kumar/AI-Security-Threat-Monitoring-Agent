import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SecOPS",
  description: "SecOPS — Incident response dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
          <div className="h-1 bg-gradient-to-r from-blue-700 via-sky-400 to-orange-500 animate-gradient-x" />
          <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between gap-6">
            <div className="flex items-center gap-5 min-w-0">
              <Link href="/" className="flex items-center gap-3 min-w-0">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-slate-900/95 text-white shadow-sm">
                  <span className="text-sm font-black tracking-tight">S</span>
                </span>
                <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-blue-700 via-sky-600 to-orange-500 bg-clip-text text-transparent truncate">
                  SecOPS
                </span>
              </Link>
              <nav className="hidden md:flex items-center gap-4 text-sm">
                <Link href="/" className="text-slate-700 hover:text-slate-900 font-semibold transition-colors">
                  Dashboard
                </Link>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">Incident response workspace</span>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs font-semibold">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                Operational
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 animate-fade-in-up">{children}</main>

        <footer className="border-t border-slate-200/70 bg-white/60">
          <div className="max-w-7xl mx-auto px-8 py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">SecOPS</span> — Premium incident response dashboard
              </div>
              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-2">
                <Link href="/" className="hover:text-slate-700 transition-colors">Dashboard</Link>
                <span className="text-slate-300">•</span>
                <span>Security operations</span>
                <span className="text-slate-300">•</span>
                <span>© {new Date().getFullYear()}</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
