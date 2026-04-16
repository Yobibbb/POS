import { Inter } from "next/font/google";
import "./globals.css";
import { ModeProvider } from "@/lib/ModeContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "CartAlogue POS System",
  description: "Point-of-Sale System for CartAlogue Smart Basket",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ModeProvider>{children}</ModeProvider>
      </body>
    </html>
  );
}
