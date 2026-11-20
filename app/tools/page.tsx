'use client';

import { useMemo, useState } from 'react';
import PccGenerator from './pcc-generator';
import NthGenerator from './nth-generator';
import BandwidthMonitorGenerator from './bandwidth-monitor';
import BurstLimitCalculator from './burst-limit-calculator';
import PcqGenerator from './pcq-generator';
import SiteBlockGenerator from './site-block-generator';
import { recordToolUse } from './usage-counter';
import {
  Activity, ArrowLeft, ArrowRight, Cable, Calculator, Check, Clipboard,
  Download, Gauge, Globe, Network, Router, Search, Shield, Wifi, Zap, Sun, Moon
} from 'lucide-react';

type ToolId = 'subnet' | 'bandwidth' | 'optical' | 'pcc' | 'nth' | 'monitor' | 'queue' | 'dhcp' | 'burst' | 'pcq' | 'siteblock';
type ToolCard = { id: ToolId; title: string; desc: string; category: string; tags: string[] };

const tools: ToolCard[] = [
  { id: 'subnet', title: 'IP & Subnet Calculator', desc: 'Hitung network address, broadcast, subnet mask, dan jumlah host IPv4.', category: 'IP & NETWORK', tags: ['ip', 'subnet', 'cidr', 'network'] },
  { id: 'bandwidth', title: 'Bandwidth Calculator', desc: 'Bagi kapasitas bandwidth berdasarkan jumlah pelanggan dan profil layanan.', category: 'BANDWIDTH & QoS', tags: ['bandwidth', 'speed', 'limit', 'qos'] },
  { id: 'optical', title: 'Optical Link Budget', desc: 'Estimasi daya terima optik dari TX, kabel, splice, konektor, dan splitter.', category: 'FTTH & PON', tags: ['fiber', 'optical', 'pon', 'ftth', 'redaman'] },
  { id: 'pcc', title: 'MikroTik PCC Load Balancing', desc: 'Buat template mangle dan routing PCC untuk multi-WAN RouterOS.', category: 'ROUTING & MIKROTIK', tags: ['mikrotik', 'pcc', 'load balance', 'routeros'] },
  { id: 'nth', title: 'MikroTik NTH Load Balancing', desc: 'Generator Every / Packet untuk distribusi koneksi baru multi-WAN.', category: 'ROUTING & MIKROTIK', tags: ['mikrotik', 'nth', 'every', 'packet', 'load balance', 'routeros'] },
  { id: 'monitor', title: 'MikroTik Multi-ISP Bandwidth Monitor', desc: 'Generator monitor RX/TX dan estimasi kuota bulanan untuk banyak ISP.', category: 'MONITORING', tags: ['mikrotik', 'bandwidth', 'monitoring', 'quota', 'multi isp', 'rx', 'tx'] },
  { id: 'burst', title: 'MikroTik Burst Limit Calculator', desc: 'Hitung burst threshold, burst time, limit-at, dan buat script Simple Queue.', category: 'BANDWIDTH & QoS', tags: ['burst', 'burst limit', 'burst threshold', 'queue', 'qos'] },
  { id: 'pcq', title: 'MikroTik PCQ Generator', desc: 'Buat konfigurasi PCQ untuk Queue Tree dan Simple Queue.', category: 'BANDWIDTH & QoS', tags: ['pcq', 'queue tree', 'simple queue', 'mikrotik', 'qos', 'bandwidth'] },
  { id: 'siteblock', title: 'Block Website & App Generator', desc: 'Buat rule firewall untuk membatasi YouTube, TikTok, Facebook, WhatsApp, dan layanan lainnya.', category: 'SECURITY & BACKUP', tags: ['block', 'website', 'app', 'youtube', 'tiktok', 'facebook', 'whatsapp', 'firewall'] },
  { id: 'queue', title: 'Simple Queue Generator', desc: 'Buat perintah Simple Queue untuk pelanggan atau segmen jaringan.', category: 'BANDWIDTH & QoS', tags: ['queue', 'simple queue', 'pcq', 'mikrotik'] },
  { id: 'dhcp', title: 'DHCP Pool Generator', desc: 'Buat konfigurasi IP pool dan DHCP network dasar untuk RouterOS.', category: 'IP & NETWORK', tags: ['dhcp', 'pool', 'mikrotik', 'routeros'] },
];

const categories = ['SEMUA TOOLS', 'ROUTING & MIKROTIK', 'BANDWIDTH & QoS', 'HOTSPOT & PPPoE', 'IP & NETWORK', 'SECURITY & BACKUP', 'WIRELESS', 'FTTH & PON', 'MONITORING', 'DOWNLOAD CENTER'];
const planned = [
  { title: 'ECMP & Failover Generator', category: 'ROUTING & MIKROTIK', desc: 'Generator jalur multi-gateway dan failover otomatis.' },
  { title: 'NAT & Port Forwarding', category: 'ROUTING & MIKROTIK', desc: 'Generator dst-nat, src-nat, dan masquerade.' },
  { title: 'Hotspot User & Voucher', category: 'HOTSPOT & PPPoE', desc: 'Generator akun, voucher, dan profil hotspot.' },
  { title: 'PPPoE Secret Generator', category: 'HOTSPOT & PPPoE', desc: 'Pembuatan akun PPPoE secara massal.' },
  { title: 'Queue Tree & PCQ', category: 'BANDWIDTH & QoS', desc: 'Template queue tree dan PCQ.' },
  { title: 'DNS & Netwatch Tools', category: 'SECURITY & BACKUP', desc: 'Pemeriksaan DNS dan template monitoring host.' },
  { title: 'Firewall & Address List', category: 'SECURITY & BACKUP', desc: 'Generator filter rules dan address-list.' },
  { title: 'Wireless Link Planner', category: 'WIRELESS', desc: 'Perhitungan dasar link wireless dan Fresnel.' },
  { title: 'PON Splitter & FBT', category: 'FTTH & PON', desc: 'Terhubung dengan kalkulator PON utama.' },
  { title: 'Ping & Interface Monitor', category: 'MONITORING', desc: 'Tools monitoring berbasis browser.' },
  { title: 'RouterOS & Winbox Center', category: 'DOWNLOAD CENTER', desc: 'Tautan unduhan resmi MikroTik.' },
];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n < 0 || n > 255) return null;
    value = ((value << 8) | n) >>> 0;
  }
  return value >>> 0;
}
function intToIpv4(value: number): string {
  return [value >>> 24, (value >>> 16) & 255, (value >>> 8) & 255, value & 255].join('.');
}
function makeMask(prefix: number): number {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}
function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

export default function ToolsPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('SEMUA TOOLS');
  const [active, setActive] = useState<ToolId | null>(null);
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const [ip, setIp] = useState('192.168.1.1');
  const [prefix, setPrefix] = useState('24');
  const [totalMbps, setTotalMbps] = useState('100');
  const [users, setUsers] = useState('50');
  const [tx, setTx] = useState('7');
  const [fiberKm, setFiberKm] = useState('5');
  const [fiberLoss, setFiberLoss] = useState('0.35');
  const [splices, setSplices] = useState('8');
  const [spliceLoss, setSpliceLoss] = useState('0.1');
  const [connectors, setConnectors] = useState('4');
  const [connectorLoss, setConnectorLoss] = useState('0.3');
  const [splitterLoss, setSplitterLoss] = useState('10.7');
  const [ontSensitivity, setOntSensitivity] = useState('-27');
  const [wan1, setWan1] = useState('ether1');
  const [wan2, setWan2] = useState('ether2');
  const [lan, setLan] = useState('bridge');
  const [gw1, setGw1] = useState('192.168.1.1');
  const [gw2, setGw2] = useState('192.168.2.1');
  const [lanNet, setLanNet] = useState('192.168.88.0/24');
  const [rosVersion, setRosVersion] = useState('7');
  const [queueName, setQueueName] = useState('PELANGGAN-001');
  const [queueTarget, setQueueTarget] = useState('192.168.88.10');
  const [queueDown, setQueueDown] = useState('10M');
  const [queueUp, setQueueUp] = useState('5M');
  const [dhcpName, setDhcpName] = useState('dhcp-lan');
  const [dhcpInterface, setDhcpInterface] = useState('bridge');
  const [poolStart, setPoolStart] = useState('192.168.88.10');
  const [poolEnd, setPoolEnd] = useState('192.168.88.250');
  const [dhcpGateway, setDhcpGateway] = useState('192.168.88.1');
  const [dhcpDns, setDhcpDns] = useState('1.1.1.1,8.8.8.8');

  const filtered = useMemo(() => tools.filter(t =>
    (category === 'SEMUA TOOLS' || t.category === category) &&
    (t.title + ' ' + t.desc + ' ' + t.tags.join(' ')).toLowerCase().includes(query.toLowerCase())
  ), [query, category]);

  const subnet = useMemo(() => {
    const address = ipv4ToInt(ip);
    const p = Number(prefix);
    if (address === null || !Number.isInteger(p) || p < 0 || p > 32) return null;
    const mask = makeMask(p);
    const network = (address & mask) >>> 0;
    const broadcast = (network | (~mask >>> 0)) >>> 0;
    const hosts = p >= 31 ? (p === 31 ? 2 : 1) : Math.max(0, 2 ** (32 - p) - 2);
    return {
      mask: intToIpv4(mask), network: intToIpv4(network), broadcast: intToIpv4(broadcast),
      first: p >= 31 ? '—' : intToIpv4(network + 1),
      last: p >= 31 ? '—' : intToIpv4(broadcast - 1),
      hosts: hosts.toLocaleString('id-ID'), wildcard: intToIpv4((~mask) >>> 0),
    };
  }, [ip, prefix]);

  const bandwidth = useMemo(() => {
    const total = Number(totalMbps), count = Number(users);
    if (!(total > 0) || !(count > 0)) return null;
    return { average: total / count, reserve: total * 0.2, usable: total * 0.8 };
  }, [totalMbps, users]);

  const optical = useMemo(() => {
    const values = [tx, fiberKm, fiberLoss, splices, spliceLoss, connectors, connectorLoss, splitterLoss, ontSensitivity].map(Number);
    if (values.some(v => !Number.isFinite(v)) || values[1] < 0 || values[3] < 0 || values[5] < 0) return null;
    const [power, km, kmLoss, spliceCount, oneSplice, connectorCount, oneConnector, splitLoss, sensitivity] = values;
    const fiber = km * kmLoss, splice = spliceCount * oneSplice, connector = connectorCount * oneConnector;
    const total = fiber + splice + connector + splitLoss;
    const rx = power - total;
    return { fiber, splice, connector, splitLoss, total, rx, margin: rx - sensitivity };
  }, [tx, fiberKm, fiberLoss, splices, spliceLoss, connectors, connectorLoss, splitterLoss, ontSensitivity]);

  const pccScript = `# PONCALC - PCC LOAD BALANCING TEMPLATE
# RouterOS ${rosVersion}; review interface names, gateways and routing before applying.
# This template uses two WAN links with equal connection distribution.

 /ip firewall mangle
add chain=prerouting in-interface=${lan} dst-address-type=!local connection-mark=no-mark per-connection-classifier=both-addresses-and-ports:2/0 action=mark-connection new-connection-mark=WAN1_conn passthrough=yes comment="PONCALC PCC WAN1"
add chain=prerouting in-interface=${lan} dst-address-type=!local connection-mark=no-mark per-connection-classifier=both-addresses-and-ports:2/1 action=mark-connection new-connection-mark=WAN2_conn passthrough=yes comment="PONCALC PCC WAN2"
add chain=prerouting in-interface=${lan} connection-mark=WAN1_conn action=mark-routing new-routing-mark=${rosVersion === '7' ? 'to_WAN1' : 'to_WAN1'} passthrough=no
add chain=prerouting in-interface=${lan} connection-mark=WAN2_conn action=mark-routing new-routing-mark=to_WAN2 passthrough=no

/ip route
${rosVersion === '7'
? `add dst-address=0.0.0.0/0 gateway=${gw1} routing-table=to_WAN1 check-gateway=ping comment="PONCALC WAN1"\nadd dst-address=0.0.0.0/0 gateway=${gw2} routing-table=to_WAN2 check-gateway=ping comment="PONCALC WAN2"\nadd dst-address=0.0.0.0/0 gateway=${gw1} distance=1 check-gateway=ping comment="PONCALC default WAN1"`
: `add dst-address=0.0.0.0/0 gateway=${gw1} routing-mark=to_WAN1 check-gateway=ping comment="PONCALC WAN1"\nadd dst-address=0.0.0.0/0 gateway=${gw2} routing-mark=to_WAN2 check-gateway=ping comment="PONCALC WAN2"\nadd dst-address=0.0.0.0/0 gateway=${gw1} distance=1 check-gateway=ping comment="PONCALC default WAN1"`}

# NOTE: Add router-originated traffic handling, NAT, policy routing and failover logic for your topology.
# Review RouterOS version syntax and test in Safe Mode before production.`;

  const queueScript = `/queue simple
add name="${safeName(queueName)}" target=${queueTarget} max-limit=${queueUp}/${queueDown} comment="Generated by PONCALC"`;

  const dhcpScript = `/ip pool
add name="${safeName(dhcpName)}-pool" ranges=${poolStart}-${poolEnd}

/ip dhcp-server
add name="${safeName(dhcpName)}" interface=${dhcpInterface} address-pool="${safeName(dhcpName)}-pool" disabled=no

/ip dhcp-server network
add address=${lanNet} gateway=${dhcpGateway} dns-server=${dhcpDns}`;

  const scriptFor = (id: ToolId) => id === 'pcc' ? pccScript : id === 'queue' ? queueScript : dhcpScript;
  const copyText = async (text: string) => {
    try { await navigator.clipboard.writeText(text); recordToolUse(); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setCopied(false); alert('Clipboard tidak tersedia. Silakan salin manual dari kotak script.'); }
  };
  const downloadText = (filename: string, text: string) => {
    recordToolUse();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; anchor.click();
    URL.revokeObjectURL(url);
  };

  const openTool = (id: ToolId) => { setActive(id); setCopied(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <main className={`nt-page nt-${theme}`}>
      <header className="nt-header">
        <a className="nt-brand" href="/PON/tools/" aria-label="NETFORGE Home"><span className="nt-brand-icon"><Zap size={21}/></span><span><b>NET<span>FORGE</span></b><small>NETWORK ENGINEERING TOOLS</small></span></a>
        <nav className="nf-main-nav"><a href="/PON/">HOME</a><a className="active" href="/PON/tools/">TOOLS</a><a href="/PON/updates/">UPDATES</a><a href="/PON/docs/">DOCS</a><a href="/PON/contact/">CONTACT</a></nav><div className="nt-header-actions"><button className="nt-theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Aktifkan light mode' : 'Aktifkan dark mode'}>{theme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}<span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span></button><a className="nt-back" href="/PON/"><ArrowLeft size={15}/> PON Calculator</a></div>
      </header>

      <div className="nt-container">
        <section className="nt-hero">
          <div className="nt-kicker"><Zap size={14}/> BUILD SMARTER NETWORKS.</div>
          <h1>Engineering your network.<br/><span>One tool at a time.</span></h1>
          <p>Workspace teknis untuk kalkulasi, perencanaan, dan generator konfigurasi jaringan — praktis, presisi, langsung dari browser.</p>
          <div className="nt-hero-stats"><span><b>{tools.length}</b> Tools aktif</span><span><b>{categories.length - 1}</b> Kategori</span><span><b>RouterOS v6/v7</b> Template MikroTik</span></div>
        </section>

        {active ? (
          <section className="nt-workspace">
            <div className="nt-workspace-top">
              <button className="nt-backlink" onClick={() => setActive(null)}><ArrowLeft size={15}/> Semua tools</button>
              <span className="nt-live"><i/> NATIVE TOOL</span>
            </div>

            {active === 'subnet' && <>
              <div className="nt-tool-title"><Globe/><div><span>IP & NETWORK</span><h2>IP & Subnet Calculator</h2><p>Masukkan alamat IPv4 dan prefix CIDR untuk menghitung detail subnet.</p></div></div>
              <div className="nt-form-grid two">
                <label>IPv4 Address<input value={ip} onChange={e => setIp(e.target.value)} placeholder="192.168.1.1"/></label>
                <label>Prefix CIDR<select value={prefix} onChange={e => setPrefix(e.target.value)}>{Array.from({length:33},(_,i)=><option key={i} value={i}>/{i}</option>)}</select></label>
              </div>
              {subnet ? <div className="nt-results">
                {[['Network Address',subnet.network],['Subnet Mask',subnet.mask],['Wildcard Mask',subnet.wildcard],['Broadcast Address',subnet.broadcast],['First Usable Host',subnet.first],['Last Usable Host',subnet.last],['Usable Hosts',subnet.hosts]].map(([k,v])=><div className="nt-result" key={k}><small>{k}</small><b>{v}</b></div>)}
              </div> : <div className="nt-alert">Alamat IPv4 atau prefix CIDR tidak valid.</div>}
            </>}

            {active === 'bandwidth' && <>
              <div className="nt-tool-title"><Gauge/><div><span>BANDWIDTH & QoS</span><h2>Bandwidth Calculator</h2><p>Estimasi pembagian kapasitas total secara merata. Ini bukan pengganti perencanaan oversubscription.</p></div></div>
              <div className="nt-form-grid two">
                <label>Total bandwidth (Mbps)<input type="number" min="0.1" step="0.1" value={totalMbps} onChange={e => setTotalMbps(e.target.value)}/></label>
                <label>Jumlah pelanggan aktif<input type="number" min="1" step="1" value={users} onChange={e => setUsers(e.target.value)}/></label>
              </div>
              {bandwidth ? <div className="nt-results three">
                <div className="nt-result"><small>Rata-rata per pelanggan</small><b>{bandwidth.average.toFixed(2)} Mbps</b></div>
                <div className="nt-result"><small>Kapasitas utilisasi 80%</small><b>{bandwidth.usable.toFixed(2)} Mbps</b></div>
                <div className="nt-result"><small>Cadangan 20%</small><b>{bandwidth.reserve.toFixed(2)} Mbps</b></div>
              </div> : <div className="nt-alert">Masukkan bandwidth dan jumlah pelanggan yang valid.</div>}
            </>}

            {active === 'optical' && <>
              <div className="nt-tool-title"><Cable/><div><span>FTTH & PON</span><h2>Optical Link Budget</h2><p>Estimasi Rx berdasarkan redaman komponen jalur optik yang dimasukkan.</p></div></div>
              <div className="nt-form-grid three">
                <label>Daya TX (dBm)<input type="number" step=".01" value={tx} onChange={e => setTx(e.target.value)}/></label>
                <label>Panjang fiber (km)<input type="number" min="0" step=".1" value={fiberKm} onChange={e => setFiberKm(e.target.value)}/></label>
                <label>Loss fiber (dB/km)<input type="number" min="0" step=".01" value={fiberLoss} onChange={e => setFiberLoss(e.target.value)}/></label>
                <label>Jumlah splice<input type="number" min="0" step="1" value={splices} onChange={e => setSplices(e.target.value)}/></label>
                <label>Loss per splice (dB)<input type="number" min="0" step=".01" value={spliceLoss} onChange={e => setSpliceLoss(e.target.value)}/></label>
                <label>Jumlah konektor<input type="number" min="0" step="1" value={connectors} onChange={e => setConnectors(e.target.value)}/></label>
                <label>Loss per konektor (dB)<input type="number" min="0" step=".01" value={connectorLoss} onChange={e => setConnectorLoss(e.target.value)}/></label>
                <label>Loss splitter total (dB)<input type="number" min="0" step=".01" value={splitterLoss} onChange={e => setSplitterLoss(e.target.value)}/></label>
                <label>Ambang Rx acuan (dBm)<input type="number" step=".1" value={ontSensitivity} onChange={e => setOntSensitivity(e.target.value)}/></label>
              </div>
              {optical ? <div className="nt-optical-result">
                <div className="nt-optical-main"><small>ESTIMASI DAYA TERIMA (RX)</small><strong>{optical.rx.toFixed(2)} dBm</strong><span className={optical.margin >= 0 ? 'nt-good' : 'nt-bad'}>{optical.margin >= 0 ? `Margin ${optical.margin.toFixed(2)} dB terhadap ambang` : `Di bawah ambang ${Math.abs(optical.margin).toFixed(2)} dB`}</span></div>
                <div className="nt-results two">
                  {[['Loss fiber',optical.fiber],['Loss splice',optical.splice],['Loss konektor',optical.connector],['Loss splitter',optical.splitLoss],['Total loss',optical.total]].map(([k,v])=><div className="nt-result" key={k}><small>{k}</small><b>{Number(v).toFixed(2)} dB</b></div>)}
                </div>
              </div> : <div className="nt-alert">Periksa kembali parameter redaman yang dimasukkan.</div>}
              <p className="nt-disclaimer">Hasil adalah estimasi matematis. Ambang Rx harus disesuaikan dengan kelas optik dan datasheet perangkat. Verifikasi menggunakan OPM.</p>
            </>}

            {active === 'pcc' && <PccGenerator/>}
            {active === 'nth' && <NthGenerator/>}
            {active === 'monitor' && <BandwidthMonitorGenerator/>}

            {active === 'burst' && <BurstLimitCalculator/>}
            {active === 'pcq' && <PcqGenerator/>}
            {active === 'siteblock' && <SiteBlockGenerator/>}

            {active === 'queue' && <>
              <div className="nt-tool-title"><Activity/><div><span>BANDWIDTH & QoS</span><h2>Simple Queue Generator</h2><p>Susun satu perintah Simple Queue untuk target pelanggan.</p></div></div>
              <div className="nt-form-grid two">
                <label>Nama queue<input value={queueName} onChange={e => setQueueName(e.target.value)}/></label>
                <label>Target IP / subnet<input value={queueTarget} onChange={e => setQueueTarget(e.target.value)}/></label>
                <label>Upload maksimum<input value={queueUp} onChange={e => setQueueUp(e.target.value)}/></label>
                <label>Download maksimum<input value={queueDown} onChange={e => setQueueDown(e.target.value)}/></label>
              </div>
              <div className="nt-alert">Urutan max-limit RouterOS adalah upload/download. Pastikan target dan satuan bandwidth sesuai konfigurasi router.</div>
              <div className="nt-script-actions"><button onClick={() => copyText(queueScript)}><Clipboard size={15}/>{copied ? 'Tersalin' : 'Salin Script'}</button><button className="nt-button-light" onClick={() => downloadText('poncalc-simple-queue.rsc',queueScript)}><Download size={15}/> Unduh .rsc</button></div>
              <pre className="nt-code"><code>{queueScript}</code></pre>
            </>}

            {active === 'dhcp' && <>
              <div className="nt-tool-title"><Network/><div><span>IP & NETWORK</span><h2>DHCP Pool Generator</h2><p>Buat template IP pool, DHCP server, dan DHCP network sederhana.</p></div></div>
              <div className="nt-form-grid two">
                <label>Nama DHCP<input value={dhcpName} onChange={e => setDhcpName(e.target.value)}/></label>
                <label>Interface<input value={dhcpInterface} onChange={e => setDhcpInterface(e.target.value)}/></label>
                <label>Pool awal<input value={poolStart} onChange={e => setPoolStart(e.target.value)}/></label>
                <label>Pool akhir<input value={poolEnd} onChange={e => setPoolEnd(e.target.value)}/></label>
                <label>Network CIDR<input value={lanNet} onChange={e => setLanNet(e.target.value)}/></label>
                <label>Gateway<input value={dhcpGateway} onChange={e => setDhcpGateway(e.target.value)}/></label>
                <label>DNS server<input value={dhcpDns} onChange={e => setDhcpDns(e.target.value)}/></label>
              </div>
              <div className="nt-alert">Pastikan interface sudah memiliki IP gateway, alamat pool berada dalam subnet yang benar, dan belum digunakan oleh DHCP server lain.</div>
              <div className="nt-script-actions"><button onClick={() => copyText(dhcpScript)}><Clipboard size={15}/>{copied ? 'Tersalin' : 'Salin Script'}</button><button className="nt-button-light" onClick={() => downloadText('poncalc-dhcp-pool.rsc',dhcpScript)}><Download size={15}/> Unduh .rsc</button></div>
              <pre className="nt-code"><code>{dhcpScript}</code></pre>
            </>}
          </section>
        ) : (
          <>
            <section className="nt-searchbar">
              <Search size={18}/>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari tools, misalnya subnet, PCC, queue, optical..."/>
              {query && <button onClick={() => setQuery('')}>Hapus</button>}
            </section>
            <nav className="nt-categories">{categories.map(c=><button key={c} className={category===c?'selected':''} onClick={()=>setCategory(c)}>{c}</button>)}</nav>
            <div className="nt-section-head"><div><span>TOOLS SIAP DIGUNAKAN</span><h2>Native Network Calculators</h2></div><b>{filtered.length} tools</b></div>
            <div className="nt-card-grid">
              {filtered.map(t=><button className="nt-tool-card" key={t.id} onClick={()=>openTool(t.id)}>
                <span className="nt-card-icon">{t.id==='subnet'?<Globe/>:t.id==='bandwidth'?<Gauge/>:t.id==='optical'?<Cable/>:t.id==='pcc'?<Router/>:t.id==='burst'?<Gauge/>:t.id==='queue'?<Activity/>:<Network/>}</span>
                <span className="nt-card-category">{t.category}</span><b>{t.title}</b><span className="nt-card-desc">{t.desc}</span><span className="nt-card-open">Buka tool <ArrowRight size={14}/></span>
              </button>)}
            </div>
            <div className="nt-section-head nt-planned-head"><div><span>ROADMAP PENGEMBANGAN NATIVE</span><h2>Kategori & Tools Berikutnya</h2></div></div>
            <div className="nt-roadmap-grid">
              {planned.filter(t=>category==='SEMUA TOOLS'||t.category===category).map(t=><article className="nt-roadmap-card" key={t.title}><span>{t.category}</span><b>{t.title}</b><p>{t.desc}</p><small>Dalam tahap pengembangan</small></article>)}
            </div>
            <div className="nt-note"><Shield size={17}/> Semua generator berjalan lokal di browser. Script yang dihasilkan harus diperiksa dan diuji di lab / Safe Mode sebelum diterapkan ke router produksi.</div>
          </>
        )}
        <footer className="nt-footer"><div>© Copyright 2020-2026 - All Rights Reserved.<br/><span>Project By <strong>Irfann JT</strong> @ <strong>NETFORGE Tools</strong> · Jakarta Capital Region &amp; Bogor, INDONESIA</span></div><span>BUILD SMARTER NETWORKS.</span></footer>
      </div>
    </main>
  );
}
