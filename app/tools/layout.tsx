import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NETFORGE | Network Engineering Tools',
  description: 'NETFORGE Network Engineering Tools — kalkulator, perencanaan, dan generator konfigurasi jaringan.',
};

export default function ToolsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
