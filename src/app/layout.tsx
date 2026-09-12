import type { Metadata } from "next";
import { Source_Serif_4, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NavBar from "@/components/NavBar";

const serif = Source_Serif_4({
  variable: "--font-serif-display",
  subsets: ["latin"],
  weight: ["400", "600"],
});
const sansUi = IBM_Plex_Sans({
  variable: "--font-sans-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
const monoData = IBM_Plex_Mono({
  variable: "--font-mono-data",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "DoShare — Access, not ownership",
  description: "Give someone access to a document without giving away the document.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const userId = await getCurrentUserId();
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;

  return (
    <html
      lang="en"
      className={`${serif.variable} ${sansUi.variable} ${monoData.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink font-sans">
        <NavBar signedIn={!!user} email={user?.email ?? undefined} />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
