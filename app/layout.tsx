import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "potymarket",
  description: "פלטפורמת שוקי חיזוי לחבורת ילד גלידה, עם יצירת מרקטים מצ'אט וואטסאפ וטריידים בכסף משחק.",
  openGraph: {
    title: "potymarket",
    description: "פלטפורמת שוקי חיזוי לחבורת ילד גלידה, עם יצירת מרקטים מצ'אט וואטסאפ וטריידים בכסף משחק.",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "potymarket",
    description: "פלטפורמת שוקי חיזוי לחבורת ילד גלידה, עם יצירת מרקטים מצ'אט וואטסאפ וטריידים בכסף משחק."
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
