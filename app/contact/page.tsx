import type { Metadata } from 'next';
import { Mail, MapPin, MessageCircle, Clock3 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact | NETFORGE',
  description: 'Hubungi Irfann JT, pengembang NETFORGE Network Engineering Tools.',
};

export default function ContactPage() {
  return (
    <main className="nf-info-page">
      <header className="nf-info-header"><a href="/PON/tools/" className="nf-info-brand">NET<span>FORGE</span></a><nav><a href="/PON/">HOME</a><a href="/PON/tools/">TOOLS</a><a href="/PON/price/">PRICE</a><a href="/PON/updates/">UPDATES</a><a href="/PON/docs/">DOCS</a><a className="active" href="/PON/contact/">CONTACT</a></nav></header>
      <section className="nf-info-card">
        <div className="nf-info-eyebrow">CONTACT</div><h1>CONTACT PERSON</h1>
        <article><small><MapPin size={14}/> LOCATION / ADDRESS</small><b>NETFORGE</b><p>Jakarta Capital Region & Bogor, Indonesia</p></article>
        <article><small><Mail size={14}/> E-MAIL SUPPORT</small><a href="mailto:nfntdigital@gmail.com">nfntdigital@gmail.com</a></article>
        <article><small><MessageCircle size={14}/> WHATSAPP / CONTACT PERSON</small><b>Irfann JT</b><a href="https://wa.me/6285187380500" target="_blank" rel="noreferrer">+62 851-8738-0500</a></article>
        <article><small><Clock3 size={14}/> WORKING HOURS</small><b>Online Support</b><p>Silakan hubungi melalui WhatsApp atau email untuk ketersediaan.</p></article>
        <footer><div className="nf-footer-copy">© Copyright 2020-2026 NETFORGE - All Rights Reserved.<br/>Project By Irfann JT · Jakarta Capital Region & Bogor, Indonesia</div><a className="nf-hit-counter" href="https://hits.sh/mikrotikscript.github.io/PON/" target="_blank" rel="noreferrer" aria-label="NETFORGE site visit counter"><img src="https://hits.sh/mikrotikscript.github.io/PON.svg?style=flat-square&label=visits" alt="NETFORGE visits" loading="lazy"/></a></footer>
      </section>
    </main>
  );
}
