import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./clean.css";
import "./clarity.css";
import "./themes.css";
import "./refinements.css";
import "./notifications.css";
import "./planning.css";
import "./caderno.css";
import { Caveat, Instrument_Serif, Work_Sans } from "next/font/google";
import { DengoProvider } from "@/components/provider";

// Fontes baixadas no build e servidas pelo próprio Dengo (nenhuma chamada ao Google no uso).
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif", display: "swap" });
const sans = Work_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const hand = Caveat({ subsets: ["latin"], variable: "--font-hand", display: "swap" });
export const metadata: Metadata = {
  title: "Dengo · Caderno de nós dois",
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
  themeColor: "#F5EDE0",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-dengo-theme="caderno" suppressHydrationWarning className={`${serif.variable} ${sans.variable} ${hand.variable}`}>
      <body>
        <DengoProvider>{children}</DengoProvider>
      </body>
    </html>
  );
}
