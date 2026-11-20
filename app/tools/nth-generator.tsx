'use client';

import { useMemo, useState } from 'react';
import { Clipboard, Download, Network } from 'lucide-react';
import { recordToolUse } from './usage-counter';

type Wan = { id: number; iface: string; gateway: string };
const seed: Wan[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  iface: 'ether' + (i + 1),
  gateway: '192.168.' + (i + 1) + '.1',
}));
const tokenOK = (v: string) => /^[a-zA-Z0-9_.:-]{1,32}$/.test(v.trim());
const ipv4OK = (v: string) => {
  const p = v.trim().split('.');
  return p.length === 4 && p.every(x => /^\d{1,3}$/.test(x) && Number(x) <= 255);
};
const cidrOK = (v: string) => {
  const p = v.trim().split('/');
  return p.length <= 2 && ipv4OK(p[0]) && (p.length === 1 || (/^\d{1,2}$/.test(p[1]) && Number(p[1]) <= 32));
};

export default function NthGenerator() {
  const [version, setVersion] = useState('7');
  const [count, setCount] = useState('2');
  const [lan, setLan] = useState('bridge');
  const [local, setLocal] = useState('192.168.88.0/24');
  const [wans, setWans] = useState<Wan[]>(seed);
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const selected = wans.slice(0, Number(count));

  const error = useMemo(() => {
    if (!tokenOK(lan)) return 'Nama interface LAN/bridge tidak valid.';
    if (!cidrOK(local)) return 'LAN subnet harus berupa IPv4/CIDR yang valid.';
    if (selected.some(w => !tokenOK(w.iface))) return 'Nama interface WAN tidak valid.';
    if (selected.some(w => !ipv4OK(w.gateway) && !tokenOK(w.gateway))) return 'Gateway harus IPv4 atau nama interface untuk WAN DHCP.';
    if (new Set(selected.map(w => w.iface)).size !== selected.length) return 'Interface WAN tidak boleh duplikat.';
    if (selected.some(w => w.iface === lan)) return 'Interface LAN tidak boleh sama dengan WAN.';
    return '';
  }, [lan, local, selected]);

  const script = useMemo(() => {
    if (error) return '';
    const rows = selected.map(w => ({ ...w, mark: 'cm-' + w.iface, table: 'to-' + w.iface }));
    const total = rows.length;
    const out: string[] = [
      '# NETFORGE - LOAD BALANCE NTH (EVERY / PACKET)',
      '# RouterOS ' + (version === '7' ? '7.x' : '6.49.x'),
      '# Distribution: round-robin per new connection using nth=' + total + ',index',
      '# Backup konfigurasi dan audit gateway/interface sebelum import.',
      '',
      '/ip firewall address-list',
      'add address=192.168.0.0/16 list=ip-local comment="NETFORGE NTH"',
      'add address=172.16.0.0/12 list=ip-local comment="NETFORGE NTH"',
      'add address=10.0.0.0/8 list=ip-local comment="NETFORGE NTH"',
      'add address=' + local.trim() + ' list=ip-local comment="NETFORGE LAN subnet"',
      '',
      '/ip firewall nat',
    ];
    rows.forEach(w => out.push('add chain=srcnat out-interface="' + w.iface + '" action=masquerade comment="NETFORGE NTH NAT ' + w.iface + '"'));
    if (version === '7') {
      out.push('', '/routing table');
      rows.forEach(w => out.push('add fib name="' + w.table + '"'));
    }
    out.push('', '/ip route');
    rows.forEach(w => out.push(version === '7'
      ? 'add dst-address=0.0.0.0/0 gateway="' + w.gateway + '" routing-table="' + w.table + '" distance=1 check-gateway=ping comment="NETFORGE NTH ' + w.iface + '"'
      : 'add dst-address=0.0.0.0/0 gateway="' + w.gateway + '" routing-mark="' + w.table + '" distance=1 check-gateway=ping comment="NETFORGE NTH ' + w.iface + '"'));
    rows.forEach((w, i) => out.push('add dst-address=0.0.0.0/0 gateway="' + w.gateway + '" distance=' + (i + 1) + ' check-gateway=ping comment="NETFORGE NTH main ' + w.iface + '"'));
    out.push('', '/ip firewall mangle');
    out.push('add chain=prerouting src-address-list=ip-local dst-address-list=ip-local action=accept comment="NETFORGE NTH bypass local"');
    rows.forEach(w => out.push('add chain=prerouting in-interface="' + w.iface + '" connection-state=new action=mark-connection new-connection-mark="' + w.mark + '" passthrough=yes comment="NETFORGE NTH inbound ' + w.iface + '"'));
    rows.forEach(w => out.push('add chain=output connection-mark="' + w.mark + '" action=mark-routing new-routing-mark="' + w.table + '" passthrough=no comment="NETFORGE NTH router reply ' + w.iface + '"'));
    rows.forEach((w, i) => out.push('add chain=prerouting src-address-list=ip-local dst-address-list=!ip-local connection-state=new nth=' + total + ',' + (i + 1) + ' action=mark-connection new-connection-mark="' + w.mark + '" passthrough=yes comment="NETFORGE NTH ' + w.iface + ' every ' + total + ' packet ' + (i + 1) + '"'));
    rows.forEach(w => out.push('add chain=prerouting src-address-list=ip-local dst-address-list=!ip-local connection-mark="' + w.mark + '" action=mark-routing new-routing-mark="' + w.table + '" passthrough=no comment="NETFORGE NTH route ' + w.iface + '"'));
    out.push('', '# NTH membagi koneksi baru secara bergiliran, bukan membagi satu sesi download ke banyak WAN.');
    out.push('# nth=' + total + ',1 ... nth=' + total + ',' + total + ' mendistribusikan koneksi ke ' + total + ' WAN.');
    out.push('# Route bertanda memakai gateway WAN masing-masing; default route main memakai distance bertingkat.');
    out.push('# check-gateway=ping hanya memeriksa next-hop. Uji failover dan akses internet sesuai topologi.');
    out.push('# Pastikan subnet lokal lain ditambahkan ke address-list ip-local bila diperlukan.');
    return out.join('\n');
  }, [error, selected, version, local]);

  const setWan = (id: number, key: keyof Wan, value: string) =>
    setWans(old => old.map(w => w.id === id ? { ...w, [key]: value } : w));
  const copy = async () => {
    try { await navigator.clipboard.writeText(script); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }
    catch { setCopied(false); alert('Clipboard tidak tersedia. Salin script secara manual.'); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([script], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'netforge-load-balance-nth.rsc'; a.click(); URL.revokeObjectURL(url);
  };

  return <>
    <div className="nt-tool-title"><Network/><div><span>ROUTING & MIKROTIK</span><h2>Load Balance NTH Generator</h2><p>Distribusi koneksi baru dengan metode NTH (Every / Packet) untuk multi-WAN.</p></div></div>
    <div className="nt-form-grid two">
      <label>Versi RouterOS<select value={version} onChange={e => { setVersion(e.target.value); setGenerated(false); }}><option value="7">RouterOS 7.x</option><option value="6">RouterOS 6.49.x</option></select></label>
      <label>Jumlah WAN<select value={count} onChange={e => { setCount(e.target.value); setGenerated(false); }}>{Array.from({length:7},(_,i)=><option key={i+2} value={i+2}>{i+2} WAN</option>)}</select></label>
      <label>Interface LAN / Bridge<input value={lan} onChange={e => { setLan(e.target.value); setGenerated(false); }}/></label>
      <label>LAN subnet / CIDR<input value={local} onChange={e => { setLocal(e.target.value); setGenerated(false); }} placeholder="192.168.88.0/24"/></label>
    </div>
    <div className="nt-section-head" style={{marginTop:20}}><div><span>NTH WAN CONFIGURATION</span><h2>Interface dan Gateway ISP</h2></div><b>{count} WAN</b></div>
    <div className="nt-form-grid two">
      {selected.map((w,i)=><div className="nt-result" key={w.id} style={{display:'grid',gap:9}}>
        <b>WAN Internet-{i+1}</b>
        <label>Interface WAN<input value={w.iface} onChange={e=>{setWan(w.id,'iface',e.target.value);setGenerated(false);}}/></label>
        <label>Gateway IPv4 / interface DHCP<input value={w.gateway} onChange={e=>{setWan(w.id,'gateway',e.target.value);setGenerated(false);}}/></label>
      </div>)}
    </div>
    {error && <div className="nt-alert">{error}</div>}
    <div className="nt-alert">Metode NTH membagi koneksi baru secara bergiliran. Untuk 2 WAN, rule menggunakan <b>nth=2,1</b> dan <b>nth=2,2</b>, sesuai pola Every / Packet pada referensi Bapak.</div>
    <div className="nt-script-actions">
      <button onClick={()=>{setGenerated(true);recordToolUse();}} disabled={!!error}>Generate Script</button>
      <button className="nt-button-light" onClick={copy} disabled={!generated||!!error}><Clipboard size={15}/>{copied?'Tersalin':'Salin Script'}</button>
      <button className="nt-button-light" onClick={download} disabled={!generated||!!error}><Download size={15}/> Unduh .rsc</button>
    </div>
    {generated&&!error&&<><div className="nt-alert">Script dibuat untuk {count} WAN. Periksa kembali seluruh interface, gateway, routing table, dan address-list. Jangan impor berulang tanpa membersihkan rule lama. Backup konfigurasi dan uji dengan Safe Mode sebelum digunakan pada router produksi.</div><pre className="nt-code"><code>{script}</code></pre></>}
    <p className="nt-disclaimer">Generator ini mengikuti pola NTH dari referensi yang diberikan dan menyesuaikan sintaks routing table untuk RouterOS v6/v7. Verifikasi konfigurasi pada topologi lab sebelum produksi.</p>
  </>;
}
