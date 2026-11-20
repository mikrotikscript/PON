import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PONCALC Network Tools',
  description: 'Kumpulan kalkulator FTTH dan tools jaringan MikroTik.',
};

export default function ToolsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
