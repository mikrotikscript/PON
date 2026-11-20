import type { Metadata } from 'next';
import { CheckCircle2, Sparkles, Wrench } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Price | NETFORGE',
  description: 'Informasi harga dan akses NETFORGE Network Engineering Tools.',
};

export default function PricePage() {
  return (
    <main className="nf-info-page">
      <header className="nf-info-header">
        <a href="/PON/" className="nf-info-brand">NET<span>FORGE</span></a>
        <nav>
          <a href="/PON/">HOME</a><a href="/PON/tools/">TOOLS</a><a className="active" href="/PON/price/">PRICE</a><a href="/PON/updates/">UPDATES</a><a href="/PON/docs/">DOCS</a><a href="/PON/contact/">CONTACT</a>
        </nav>
      </header>
      <section className="nf-info-card nf-price-card">
        <div className="nf-info-eyebrow">SIMPLE & TRANSPARENT</div>
        <h1>PRICING & ACCESS</h1>
        <p className="nf-info-intro">Mulai gunakan NETFORGE Network Engineering Tools untuk membantu pekerjaan jaringan Anda.</p>
        <article className="nf-price-plan">
          <div className="nf-price-plan-top"><span><Wrench size={17}/> NETFORGE TOOLS</span><b className="nf-price-free">FREE</b></div>
          <h2>Free Access</h2>
          <div className="nf-price-amount">Rp0 <small>/ saat ini</small></div>
          <p>Akses gratis ke tool yang tersedia di website NETFORGE.</p>
          <ul>
            <li><CheckCircle2 size={15}/> Kalkulator dan network tools</li>
            <li><CheckCircle2 size={15}/> Generator script MikroTik yang tersedia</li>
            <li><CheckCircle2 size={15}/> Copy dan download konfigurasi</li>
            <li><CheckCircle2 size={15}/> Dokumentasi dan pembaruan fitur</li>
            <li><CheckCircle2 size={15}/> Akses langsung melalui browser</li>
          </ul>
          <a className="nf-price-cta" href="/PON/tools/">EXPLORE TOOLS <Sparkles size={15}/></a>
        </article>
        <article className="nf-price-future">
          <b>Fitur dan layanan tambahan</b>
          <p>NETFORGE dapat mengembangkan layanan tambahan di masa mendatang. Jika ada paket berbayar, harga, fitur, dan ketentuannya akan diumumkan secara transparan di halaman ini. Saat ini belum ada paket berbayar yang ditawarkan melalui website.</p>
        </article>
        <footer><div className="nf-footer-copy">© Copyright 2020-2026 NETFORGE - All Rights Reserved.<br/>Project By Irfann JT @ NETFORGE Tools · Jakarta Capital Region & Bogor, INDONESIA</div><a className="nf-hit-counter" href="https://hits.sh/mikrotikscript.github.io/PON/" target="_blank" rel="noreferrer" aria-label="NETFORGE site visit counter"><img src="https://hits.sh/mikrotikscript.github.io/PON.svg?style=flat-square&label=visits" alt="NETFORGE visits" loading="lazy"/></a></footer>
      </section>
    </main>
  );
}
