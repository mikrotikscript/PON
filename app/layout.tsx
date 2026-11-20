import type { Metadata } from 'next';
import './globals.css';
import './tools/tools.css';

export const metadata: Metadata = {
  title: 'PON Calculator | FTTH & PON Tools',
  description: 'Kalkulator pembagian splitter FBT dan PLC untuk jaringan FTTH.',
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
      </body>
    </html>
  );
}
