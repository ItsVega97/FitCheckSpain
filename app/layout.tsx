import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FitCheckSpain — Ofertas de ropa",
  description: "Catálogo personal de ofertas y descuentos de ropa recopilados automáticamente",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
