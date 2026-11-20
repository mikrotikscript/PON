import type { Metadata } from 'next';
import './globals.css';
import './tools/tools.css';
import UsageCounter from './usage-counter';

export const metadata: Metadata = {
  title: 'NETFORGE | Network Engineering Platform',
  description: 'NETFORGE Network Engineering Platform — tools jaringan dan kalkulator redaman fiber optik PON.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        {children}
        <a className="pon-tools-float" href="/PON/tools/" aria-label="Buka Network Tools">
          <span className="pon-tools-float-mark">⌘</span>
          <span>NETWORK TOOLS</span>
        </a>
        <UsageCounter />
      </body>
    </html>
  );
}
