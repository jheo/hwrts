import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';

import './globals.css';
import { Providers } from './providers';

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

// Inline script to prevent FOUC (Flash of Unstyled Content)
const themeScript = `
(function() {
  try {
    var mode = localStorage.getItem('hw-theme') || 'system';
    var theme = mode;
    if (mode === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${inter.variable} ${playfairDisplay.variable} font-sans antialiased bg-[var(--surface-primary)] text-[var(--text-primary)]`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
