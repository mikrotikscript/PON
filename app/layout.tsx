import type { Metadata } from 'next';
import './globals.css';
import './tools/tools.css';

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
        <a className="netforge-hit-counter" href="https://laobi.icu/" target="_blank" rel="noopener noreferrer" aria-label="NETFORGE total page hits" title="Total kunjungan NETFORGE">
          <img src="https://visitor-badge.laobi.icu/badge?page_id=netforge.network-engineering-tools&left_text=HITS&left_color=111827&right_color=f97316&format=true" alt="NETFORGE total hits" />
        </a>
      </body>
    </html>
  );
}
