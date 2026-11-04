import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./clean.css";
import "./clarity.css";
import { DengoProvider } from "@/components/provider";
export const metadata: Metadata = {
  title: "Dengo · Nosso cotidiano",
  description: "Um lugar para cuidar da vida a dois.",
  icons: { icon: "/icon.svg" },
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
