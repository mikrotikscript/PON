import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Updates | NETFORGE', description: 'Pembaruan fitur dan pengembangan NETFORGE Tools.' };
const items=[
 ['20 Nov 2026','MikroTik PCQ Generator','Generator PCQ untuk Queue Tree dan Simple Queue.'],
 ['20 Nov 2026','Block Website & App Generator','Template firewall untuk pemblokiran domain layanan populer.'],
 ['Nov 2026','MikroTik Multi-ISP Bandwidth Monitor','Generator pemantauan RX/TX dan estimasi kuota untuk multi-ISP.'],
 ['Nov 2026','MikroTik PCC & NTH Generator','Template load balancing multi-WAN untuk RouterOS.'],
];
export default function UpdatesPage(){return <main className="nf-info-page"><header className="nf-info-header"><a href="/PON/tools/" className="nf-info-brand">NET<span>FORGE</span></a><nav><a href="/PON/tools/">HOME</a><a className="active" href="/PON/updates/">UPDATES</a><a href="/PON/docs/">DOCS</a><a href="/PON/contact/">CONTACT</a></nav></header><section className="nf-info-card"><div className="nf-info-eyebrow">CHANGELOG</div><h1>UPDATES & RELEASE NOTES</h1><p className="nf-info-intro">Riwayat penambahan dan penyempurnaan NETFORGE Network Engineering Tools.</p>{items.map(([date,title,desc])=><article className="nf-update-item" key={title}><small>{date}</small><b>{title}</b><p>{desc}</p></article>)}<footer><div className="nf-footer-copy">© Copyright 2020-2026 NETFORGE - All Rights Reserved.</div><a className="nf-hit-counter" href="https://hits.sh/mikrotikscript.github.io/PON/" target="_blank" rel="noreferrer" aria-label="NETFORGE site visit counter"><img src="https://hits.sh/mikrotikscript.github.io/PON.svg?style=flat-square&label=visits" alt="NETFORGE visits" loading="lazy"/></a></footer></section></main>}
