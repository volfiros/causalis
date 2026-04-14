import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Causalis — Maritime World Model",
  description: "Causal simulation for global shipping. Predict disruption cascades across ocean movement, routing decisions, and carrier behavior.",
};

const SUPPRESSED_WARNINGS = [
  "THREE.Clock: This module has been deprecated",
  "THREE.Color: Alpha component of rgba",
];

const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const msg = args.join("");
  if (SUPPRESSED_WARNINGS.some((w) => msg.includes(w))) return;
  originalWarn.apply(console, args);
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${outfit.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
