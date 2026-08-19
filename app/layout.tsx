import type { Metadata } from "next";
import { Archivo, Archivo_Black } from "next/font/google";
import "./globals.css";

// Archivo para el texto y Archivo Black para los titulares y los precios:
// una grotesca con carácter, que sostiene bien los números grandes de los
// descuentos sin recurrir a las fuentes de sistema de siempre.
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-archivo-black",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FitCheckSpain — Ofertas de ropa",
  description:
    "Las mejores rebajas de ropa de 16 tiendas españolas, actualizadas cada mañana y con enlace directo al producto.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${archivo.variable} ${archivoBlack.variable}`}>
      <body>{children}</body>
    </html>
  );
}
