import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation & Terms of Use | NETFORGE',
  description: 'Panduan penggunaan, dokumentasi, dan ketentuan penggunaan NETFORGE Network Engineering Tools.',
};

const sections = [
  {
    title: 'How to use this tool?',
    body: 'NETFORGE Network Engineering Tools menyediakan kalkulator dan generator konfigurasi untuk membantu pekerjaan jaringan MikroTik. Pilih tool yang dibutuhkan, isi parameter sesuai topologi dan perangkat Anda, lalu tekan Generate. Periksa hasil konfigurasi sebelum menyalin atau mengunduhnya. Untuk panduan teknis, silakan hubungi kontak NETFORGE.',
  },
  {
    title: 'DOCS',
    body: 'Dokumentasi lengkap untuk seluruh tool saat ini masih dalam tahap pengembangan. Pastikan Anda memahami dasar MikroTik RouterOS, firewall, routing, queue, dan jaringan sebelum menggunakan script yang dihasilkan. Setiap konfigurasi harus disesuaikan dengan topologi, versi RouterOS, dan kebijakan jaringan masing-masing.',
  },
  {
    title: 'TERMS OF USE',
    body: 'NETFORGE Tools disediakan untuk membantu pembuatan template konfigurasi dan perhitungan jaringan. Tools ini berjalan secara independen dan tidak berafiliasi secara resmi dengan MikroTik. Kami tidak bertanggung jawab atas kesalahan konfigurasi, gangguan layanan, kehilangan akses, kerusakan perangkat, atau dampak lain yang timbul akibat penggunaan script, baik disengaja maupun tidak disengaja. Pengguna bertanggung jawab penuh untuk memeriksa, menguji, membuat backup, dan menerapkan konfigurasi. Selalu uji di perangkat lab atau Safe Mode sebelum digunakan pada router produksi. Dengan menggunakan NETFORGE Tools, Anda menyetujui ketentuan ini dan memahami risiko yang terkait.',
  },
];

export default function DocsPage() {
  return (
    <main className="nf-info-page">
      <header className="nf-info-header">
        <a href="/PON/tools/" className="nf-info-brand">NET<span>FORGE</span></a>
        <nav>
          <a href="/PON/tools/">HOME</a>
          <a href="/PON/updates/">UPDATES</a>
          <a className="active" href="/PON/docs/">DOCS</a>
          <a href="/PON/contact/">CONTACT</a>
        </nav>
      </header>
      <section className="nf-info-card">
        <div className="nf-info-eyebrow">DOCUMENTATION & TERMS OF USE</div>
        <h1>DOCUMENTATION & TERMS OF USE</h1>
        {sections.map((section) => (
          <article className="nf-doc-item" key={section.title}>
            <b>{section.title}</b>
            <p>{section.body}</p>
          </article>
        ))}
        <footer>
          © Copyright 2020-2026 NETFORGE - All Rights Reserved.<br />
          Project By Irfann JT @ NETFORGE Tools · Jakarta Capital Region & Bogor, INDONESIA
        </footer>
      </section>
    </main>
  );
}
