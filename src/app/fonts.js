import { Alexandria, Geist, Geist_Mono, Inter } from "next/font/google";

export const alexandria = Alexandria({
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const geist = Geist({
  subsets: ["latin"],
  display: "swap",
});

export const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
});
