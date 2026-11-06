import type { Metadata, Viewport } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { APP_CONFIG } from "@/config/appConfig";

const vazirmatn = Vazirmatn({
  subsets: ["arabic"],
});

export const revalidate = 3600;


export const metadata: Metadata = {
  title: `${APP_CONFIG.name} ${APP_CONFIG.version} - کۆمپانیای شاسوار ئەحمەد شاسوار`,
  description: `${APP_CONFIG.name} ${APP_CONFIG.version} - Professional Warehouse & Operations Platform`,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Master System",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  other: {
    google: "notranslate",
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
  noStore();
  return (
    <html lang="ku" dir="rtl" translate="no" suppressHydrationWarning className="notranslate w-full max-w-full overflow-x-hidden">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="google" content="notranslate" />
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
      <body translate="no" className={`${vazirmatn.className} notranslate antialiased min-h-screen w-full max-w-full overflow-x-hidden`}>
        {children}
        <div id="print-mount-root"></div>
      </body>
    </html>
  );
}
