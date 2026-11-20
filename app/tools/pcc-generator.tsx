'use client';

import { useMemo, useState } from 'react';
import { Clipboard, Download, Router } from 'lucide-react';

type Wan = { id: number; iface: string; gateway: string; weight: string };
const seed: Wan[] = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1,
  iface: 'ether' + (index + 1),
  gateway: '192.168.' + (index + 1) + '.1',
  weight: '1',
}));
const tokenOK = (v: string) => /^[a-zA-Z0-9_.:-]{1,32}$/.test(v.trim());
const ipv4OK = (v: string) => {
  const parts = v.trim().split('.');
  return parts.length === 4 && parts.every(p => /^\d{1,3}$/.test(p) && Number(p) <= 255);
};
const cidrOK = (v: string) => {
  const parts = v.trim().split('/');
  return parts.length <= 2 && ipv4OK(parts[0]) && (parts.length === 1 || (/^\d{1,2}$/.test(parts[1]) && Number(parts[1]) <= 32));
};

export default function PccGenerator() {
  const [version, setVersion] = useState('7');
  const [count, setCount] = useState('2');
  const [mode, setMode] = useState('equal');
  const [lan, setLan] = useState('bridge');
  const [local, setLocal] = useState('192.168.88.0/24');
  const [wans, setWans] = useState<Wan[]>(seed);
  const [copied, setCopied] = useState(false);
  const [generated, setGenerated] = useState(false);
  const selected = wans.slice(0, Number(count));

  const error = useMemo(() => {
    if (!tokenOK(lan)) return 'Nama interface LAN tidak valid.';
    if (!cidrOK(local)) return 'LAN harus berupa alamat IPv4 atau CIDR yang valid.';
    if (selected.some(w => !tokenOK(w.iface))) return 'Nama interface WAN tidak valid.';
    if (selected.some(w => !ipv4OK(w.gateway) && !tokenOK(w.gateway))) return 'Gateway harus berupa IPv4 atau nama interface untuk gateway DHCP.';
    if (new Set(selected.map(w => w.iface)).size !== selected.length) return 'Interface WAN tidak boleh duplikat.';
    if (selected.some(w => w.iface === lan)) return 'Interface LAN tidak boleh sama dengan WAN.';
    if (mode === 'weighted' && selected.some(w => !/^[1-9]$|^1[0-6]$/.test(w.weight))) return 'Bobot WAN harus bilangan bulat 1–16.';
    return '';
  }, [lan, local, selected, mode]);

  const script = useMemo(() => {
    if (error) return '';
    const rows = selected.map(w => ({ ...w, mark: 'cm-' + w.iface, table: 'to-' + w.iface, weight: mode === 'equal' ? 1 : Number(w.weight) }));
    const total = rows.reduce((sum, w) => sum + w.weight, 0);
    const out: string[] = [
      '# PONCALC - PCC MULTI-WAN LOAD BALANCING',
      '# RouterOS ' + (version === '7' ? '7.x' : '6.49.x'),
      '# Mode: ' + (mode === 'equal' ? 'Equal PCC' : 'Weighted PCC'),
      '# Backup konfigurasi router sebelum import. Audit urutan firewall/mangle.',
      '',
      '/ip firewall address-list',
      'add list=poncalc-local address=10.0.0.0/8 comment="PONCALC local"',
      'add list=poncalc-local address=172.16.0.0/12 comment="PONCALC local"',
      'add list=poncalc-local address=192.168.0.0/16 comment="PONCALC local"',
      'add list=poncalc-local address=' + local.trim() + ' comment="PONCALC LAN subnet"',
      '',
      '/ip firewall nat',
    ];
    rows.forEach(w => out.push('add chain=srcnat out-interface="' + w.iface + '" action=masquerade comment="PONCALC NAT ' + w.iface + '"'));
    if (version === '7') {
      out.push('', '/routing table');
      rows.forEach(w => out.push('add fib name="' + w.table + '"'));
    }
    out.push('', '/ip route');
    rows.forEach(primary => {
      rows.forEach((candidate, index) => {
        const distance = candidate.iface === primary.iface ? 1 : index + 2;
        out.push(version === '7'
          ? 'add dst-address=0.0.0.0/0 gateway="' + candidate.gateway + '" routing-table="' + primary.table + '" distance=' + distance + ' check-gateway=ping comment="PONCALC ' + primary.iface + ' via ' + candidate.iface + '"'
          : 'add dst-address=0.0.0.0/0 gateway="' + candidate.gateway + '" routing-mark="' + primary.table + '" distance=' + distance + ' check-gateway=ping comment="PONCALC ' + primary.iface + ' via ' + candidate.iface + '"');
      });
    });
    rows.forEach((w, i) => out.push('add dst-address=0.0.0.0/0 gateway="' + w.gateway + '" distance=' + (i + 1) + ' check-gateway=ping comment="PONCALC main failover ' + w.iface + '"'));
    out.push('', '/ip firewall mangle');
    out.push('add chain=prerouting in-interface="' + lan + '" dst-address-list=poncalc-local action=accept comment="PONCALC bypass local"');
    rows.forEach(w => out.push('add chain=input in-interface="' + w.iface + '" connection-state=new action=mark-connection new-connection-mark="' + w.mark + '" passthrough=yes comment="PONCALC inbound ' + w.iface + '"'));
    rows.forEach(w => out.push('add chain=output connection-mark="' + w.mark + '" action=mark-routing new-routing-mark="' + w.table + '" passthrough=no comment="PONCALC router reply ' + w.iface + '"'));
    let bucket = 0;
    rows.forEach(w => {
      for (let i = 0; i < w.weight; i++) {
        out.push('add chain=prerouting in-interface="' + lan + '" dst-address-list=!poncalc-local dst-address-type=!local connection-state=new connection-mark=no-mark per-connection-classifier=both-addresses-and-ports:' + total + '/' + bucket + ' action=mark-connection new-connection-mark="' + w.mark + '" passthrough=yes comment="PONCALC PCC ' + w.iface + ' ' + (bucket + 1) + '/' + total + '"');
        bucket++;
      }
    });
    rows.forEach(w => out.push('add chain=prerouting in-interface="' + lan + '" connection-mark="' + w.mark + '" dst-address-list=!poncalc-local action=mark-routing new-routing-mark="' + w.table + '" passthrough=no comment="PONCALC route ' + w.iface + '"'));
    out.push('', '# Catatan: PCC membagi koneksi baru, bukan membagi satu sesi download ke banyak WAN.');
    out.push('# Weighted PCC mengulang bucket sesuai bobot integer. Bobot 2:1 berarti rasio koneksi kira-kira 2:1.\n# Sumber trafik dipilih berdasarkan interface LAN, bukan mengecualikan alamat private; ini penting untuk klien RFC1918.');
    out.push('# Setiap policy table memiliki primary WAN dan backup WAN dengan distance bertingkat; main table juga memiliki failover.');
    out.push('# Gateway check-gateway hanya memeriksa next-hop; verifikasi reachability internet secara terpisah.');
    out.push('# Pastikan LAN subnet/address-list, gateway, interface dan urutan rule sesuai topologi.');
    return out.join('\n');
  }, [error, selected, mode, version, lan, local]);

  const setWan = (id: number, key: keyof Wan, value: string) => setWans(old => old.map(w => w.id === id ? { ...w, [key]: value } : w));
  const copy = async () => {
    try { await navigator.clipboard.writeText(script); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }
    catch { setCopied(false); alert('Clipboard tidak tersedia. Salin script secara manual.'); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([script], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'poncalc-pcc-load-balance.rsc'; a.click(); URL.revokeObjectURL(url);
  };

  return <>
    <div className="nt-tool-title"><Router/><div><span>ROUTING & MIKROTIK</span><h2>MikroTik PCC Load Balancing</h2><p>Generator multi-WAN 2–8 koneksi dengan Equal PCC atau Weighted PCC.</p></div></div>
    <div className="nt-form-grid two">
      <label>Versi RouterOS<select value={version} onChange={e => setVersion(e.target.value)}><option value="7">RouterOS 7.x</option><option value="6">RouterOS 6.49.x</option></select></label>
      <label>Jumlah WAN<select value={count} onChange={e => setCount(e.target.value)}>{Array.from({ length: 7 }, (_, i) => <option key={i + 2} value={i + 2}>{i + 2} WAN</option>)}</select></label>
      <label>Metode pembagian<select value={mode} onChange={e => setMode(e.target.value)}><option value="equal">Equal Load Balance</option><option value="weighted">Weighted PCC</option></select></label>
      <label>Interface LAN / Bridge<input value={lan} onChange={e => setLan(e.target.value)}/></label>
      <label>LAN subnet / CIDR<input value={local} onChange={e => setLocal(e.target.value)} placeholder="192.168.88.0/24"/></label>
    </div>
    <div className="nt-section-head" style={{ marginTop: 20 }}><div><span>WAN CONFIGURATION</span><h2>Interface dan Gateway ISP</h2></div><b>{count} WAN</b></div>
    <div className="nt-form-grid two">
      {selected.map((w, i) => <div className="nt-result" key={w.id} style={{ display: 'grid', gap: 9 }}>
        <b>WAN Internet-{i + 1}</b>
        <label>Interface<input value={w.iface} onChange={e => setWan(w.id, 'iface', e.target.value)}/></label>
        <label>Gateway IPv4 / interface DHCP<input value={w.gateway} onChange={e => setWan(w.id, 'gateway', e.target.value)}/></label>
        {mode === 'weighted' && <label>Bobot koneksi (1–16)<input type="number" min="1" max="16" value={w.weight} onChange={e => setWan(w.id, 'weight', e.target.value)}/></label>}
      </div>)}
    </div>
    {mode === 'weighted' && <div className="nt-alert">Atur bobot tiap WAN. Contoh 2:1:1 membagi koneksi baru dengan rasio perkiraan 50%:25%:25%.</div>}
    {error && <div className="nt-alert">{error}</div>}
    <div className="nt-script-actions">
      <button onClick={() => setGenerated(true)} disabled={!!error}>Generate Script</button>
      <button className="nt-button-light" onClick={copy} disabled={!generated || !!error}><Clipboard size={15}/>{copied ? 'Tersalin' : 'Salin Script'}</button>
      <button className="nt-button-light" onClick={download} disabled={!generated || !!error}><Download size={15}/> Unduh .rsc</button>
    </div>
    {generated && !error && <>
      <div className="nt-alert">Script dibuat untuk {count} WAN. Periksa gateway, interface, urutan mangle, dan route sebelum impor. Script menambahkan rule baru; jangan impor berulang. Failover memakai check-gateway pada next-hop, bukan recursive monitoring end-to-end. Backup konfigurasi dan uji melalui Safe Mode sebelum produksi.</div>
      <pre className="nt-code"><code>{script}</code></pre>
    </>}
  </>;
}
