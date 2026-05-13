import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({ 
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "findance.",
  description: "Your financial prospectus.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} font-sans min-h-screen selection:bg-foreground selection:text-background`}>
        {/* We removed the generic Sidebar and Topbar. The Masthead will be handled in the page. */}
        <main className="w-full min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
