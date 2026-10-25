import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_CONFIG } from "@/config/appConfig";

export const metadata: Metadata = {
  title: `${APP_CONFIG.name} ${APP_CONFIG.version}`,
  description: `${APP_CONFIG.name} ${APP_CONFIG.version} - Professional Warehouse & Operations Platform`,
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#1f2128" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="w-full max-w-full overflow-x-hidden">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="HandheldFriendly" content="true" />
        <meta name="MobileOptimized" content="width" />
        {/* Force browser to unregister any legacy service workers and clear cache storage immediately */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for (var r of registrations) { r.unregister(); }
                  });
                }
                if ('caches' in window) {
                  caches.keys().then(function(names) {
                    for (var n of names) { caches.delete(n); }
                  });
                }
                localStorage.removeItem('inventory_minimal_db_v2');
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen w-full max-w-full overflow-x-hidden">
        {children}
        <div id="print-mount-root" className="hidden print:block print:w-full print:m-0 print:p-0"></div>
      </body>
    </html>
  );
}
