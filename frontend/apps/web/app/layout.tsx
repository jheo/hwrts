import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'HumanWrites - Prove Your Words Are Yours',
  description:
    'A writing tool for the AI age. Certify that your writing is authentically human-written with verifiable Ed25519 digital signatures.',
  keywords: ['writing', 'certification', 'human-written', 'AI detection', 'editor'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${playfairDisplay.variable} font-sans antialiased bg-[var(--surface-primary)] text-[var(--text-primary)]`}
      >
        {children}
      </body>
    </html>
  );
}
