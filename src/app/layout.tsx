import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { QueryProvider } from "@/providers/QueryProvider";
import { ToastProvider } from "@/contexts/ToastContext";
import Header from "@/components/Header";
import PerformanceMonitor from "@/components/ui/PerformanceMonitor";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Optimize font loading
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap", // Optimize font loading
  preload: false, // Only preload primary font
});

export const metadata: Metadata = {
  title: {
    default: "My Meeting Minutes - Turn Meetings Into Actionable Minutes",
    template: "%s | My Meeting Minutes"
  },
  description: "Upload audio, get accurate transcripts with speaker identification, and AI-generated meeting summaries. Focus on the conversation, not the note-taking.",
  keywords: ["meeting transcription", "audio transcription", "meeting minutes", "AI summaries", "speaker identification"],
  authors: [{ name: "My Meeting Minutes" }],
  creator: "My Meeting Minutes",
  publisher: "My Meeting Minutes",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000'),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "My Meeting Minutes - Turn Meetings Into Actionable Minutes",
    description: "Upload audio, get accurate transcripts with speaker identification, and AI-generated meeting summaries. Focus on the conversation, not the note-taking.",
    url: "/",
    siteName: "My Meeting Minutes",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "My Meeting Minutes - Turn Meetings Into Actionable Minutes",
    description: "Upload audio, get accurate transcripts with speaker identification, and AI-generated meeting summaries.",
    creator: "@mymeetingminutes",
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
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Preconnect to external domains for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Viewport meta tag for mobile optimization */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
        
        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#4f46e5" />
        <meta name="msapplication-TileColor" content="#4f46e5" />
        
        {/* Prevent layout shift with critical CSS */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Critical CSS to prevent layout shift */
            body { margin: 0; font-family: system-ui, -apple-system, sans-serif; -webkit-overflow-scrolling: touch; }
            .loading-skeleton { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: loading 1.5s infinite; }
            @keyframes loading { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
            /* Mobile optimizations */
            input, textarea, select { font-size: 16px !important; }
            button, a, [role="button"] { touch-action: manipulation; user-select: none; }
            @media (max-width: 640px) { 
              .mobile-only { display: block !important; }
              .mobile-hidden { display: none !important; }
            }
          `
        }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased mobile-viewport mobile-container-safe`}>
        <PerformanceMonitor />
        <QueryProvider>
          <AuthProvider>
            <ToastProvider>
              <Header />
              <main className="min-h-screen bg-gray-50">
                {children}
              </main>
            </ToastProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
