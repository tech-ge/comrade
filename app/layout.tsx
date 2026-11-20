import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: {
    default: "Comrade Hub Kenya",
    template: "%s · Comrade Hub Kenya",
  },
  description:
    "The home for Kenyan university students — gigs, help, advice, couples, and community. School-verified. Safe. Fast.",
  applicationName: "Comrade Hub Kenya",
  authors: [{ name: "Comrade Hub Kenya" }],
  keywords: ["Kenya", "university", "students", "gigs", "campus", "comrade"],
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1b0d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem('theme');
                if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
