import type { Metadata } from "next";
import { Archivo, Archivo_Black } from "next/font/google";
import "./globals.css";
import { SITIO } from "@/lib/site";

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
  // metadataBase hace que las canónicas y las de Open Graph se resuelvan a
  // URL absolutas; sin ella Next avisa y las deja relativas, que a Google
  // no le sirven.
  metadataBase: new URL(SITIO),
  title: {
    default: "FitCheckSpain — Ofertas de ropa de tiendas españolas",
    template: "%s",
  },
  description:
    "Las mejores rebajas de ropa de 16 tiendas españolas, actualizadas cada 4 horas y con enlace directo al producto.",
  alternates: { canonical: "/" },
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
