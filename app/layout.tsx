import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./clean.css";
import "./clarity.css";
import "./themes.css";
import "./refinements.css";
import "./notifications.css";
import { DengoProvider } from "@/components/provider";
export const metadata: Metadata = {
  title: "Dengo · Nosso cotidiano",
  description: "Um lugar para cuidar da vida a dois.",
  applicationName: "Dengo",
  appleWebApp: { capable: true, title: "Dengo", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/brand/dengo-icon-32-v2.png", sizes: "32x32", type: "image/png" },
      {
        url: "/brand/dengo-icon-192-v2.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    shortcut: "/favicon.ico?v=logo2",
    apple: [
      {
        url: "/apple-touch-icon.png?v=logo2",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f8f6f2",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <DengoProvider>{children}</DengoProvider>
      </body>
    </html>
  );
}
