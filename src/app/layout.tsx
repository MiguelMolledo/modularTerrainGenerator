import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/layout/TopNav";
import { GlobalProviders } from "@/components/layout/GlobalProviders";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4200";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Modular Terrain Creator",
    template: "%s · Modular Terrain Creator",
  },
  description:
    "Design modular terrain layouts for your tabletop games. Drag, snap, and stack pieces into reusable maps — all from the browser.",
  applicationName: "Modular Terrain Creator",
  keywords: [
    "tabletop",
    "terrain",
    "map editor",
    "modular terrain",
    "wargaming",
    "RPG",
    "dungeon builder",
  ],
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Modular Terrain Creator",
    title: "Modular Terrain Creator",
    description:
      "Design modular terrain layouts for your tabletop games. Drag, snap, and stack pieces into reusable maps.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Modular Terrain Creator",
    description:
      "Design modular terrain layouts for your tabletop games. Drag, snap, and stack pieces into reusable maps.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GlobalProviders>
          <TopNav />
          {children}
        </GlobalProviders>
      </body>
    </html>
  );
}
