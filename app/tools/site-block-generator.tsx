'use client';

import { useMemo, useState } from 'react';
import { Clipboard, Download, Shield, Trash2 } from 'lucide-react';
import { recordToolUse } from './usage-counter';

const services=[
 {id:'youtube',label:'YouTube',domains:['youtube.com','www.youtube.com','m.youtube.com','youtu.be','youtubei.googleapis.com','googlevideo.com','ytimg.com','youtube-nocookie.com']},
 {id:'tiktok',label:'TikTok',domains:['tiktok.com','www.tiktok.com','tiktokv.com','tiktokcdn.com','tiktokcdn-us.com','byteoversea.com','ibytedtos.com','musical.ly']},
 {id:'facebook',label:'Facebook',domains:['facebook.com','www.facebook.com','m.facebook.com','fb.com','fbcdn.net','facebook.net','messenger.com','messenger.com']},
 {id:'whatsapp',label:'WhatsApp',domains:['whatsapp.com','www.whatsapp.com','web.whatsapp.com','whatsapp.net','wa.me']},
 {id:'instagram',label:'Instagram',domains:['instagram.com','www.instagram.com','cdninstagram.com']},
 {id:'x',label:'X / Twitter',domains:['x.com','twitter.com','t.co','twimg.com']},
 {id:'telegram',label:'Telegram',domains:['telegram.org','t.me','telegram.me','telegram.dog']},
 {id:'netflix',label:'Netflix',domains:['netflix.com','www.netflix.com','netflix.net','nflxvideo.net','nflximg.net','nflxso.net']},
 {id:'game',label:'Game Services',domains:['steampowered.com','steamcommunity.com','steamstatic.com','roblox.com','rbxcdn.com','epicgames.com','riotgames.com','mobilelegends.com']},
];

const tokenOK=(v:string)=>/^[a-zA-Z0-9_.:-]{1,32}$/.test(v.trim());
const cidrOK=(v:string)=>{
 const p=v.trim().split('/');
 const o=p[0].split('.');
 return p.length===2&&o.length===4&&o.every(x=>/^\d{1,3}$/.test(x)&&Number(x)<=255)&&/^\d{1,2}$/.test(p[1])&&Number(p[1])<=32;
};

export default function SiteBlockGenerator(){
 const [version,setVersion]=useState('7');
 const [selected,setSelected]=useState<string[]>(['youtube']);
 const [lan,setLan]=useState('bridge');
 const [subnet,setSubnet]=useState('192.168.88.0/24');
 const [listName,setListName]=useState('NETFORGE-BLOCKED-SITES');
 const [ruleName,setRuleName]=useState('NETFORGE-BLOCK-SITES');
 const [blockQuic,setBlockQuic]=useState(false);
 const [generated,setGenerated]=useState(false);
 const [copied,setCopied]=useState(false);

 const chosen=services.filter(s=>selected.includes(s.id));
 const domains=Array.from(new Set(chosen.flatMap(s=>s.domains)));
 const error=!selected.length?'Pilih minimal satu layanan yang akan diblokir.'
  :!tokenOK(lan)?'Nama interface LAN tidak valid.'
  :!cidrOK(subnet)?'Subnet LAN harus menggunakan format IPv4/CIDR yang valid.'
  :!tokenOK(listName)||!tokenOK(ruleName)?'Nama address-list atau firewall rule tidak valid.':'';

 const script=useMemo(()=>{
  if(error)return '';
  const chosenServices=services.filter(s=>selected.includes(s.id));
  const allDomains=Array.from(new Set(chosenServices.flatMap(s=>s.domains)));
  const out=[
   '# NETFORGE - WEBSITE / APP BLOCK GENERATOR',
   '# RouterOS '+(version==='7'?'7.x':'6.49.x'),
   '# Selected: '+chosenServices.map(s=>s.label).join(', '),
   '# Target LAN: '+subnet.trim()+' | Interface: '+lan.trim(),
   '# DNS domain entries resolve to IP addresses and may change over time.',
   '',
   '/ip firewall address-list'
  ];
  allDomains.forEach(d=>out.push('add list="'+listName.trim()+'" address="'+d+'" comment="NETFORGE block '+d+'"'));
  out.push('',
   '/ip firewall filter',
   'add chain=forward src-address='+subnet.trim()+' dst-address-list="'+listName.trim()+'" action=drop comment="'+ruleName.trim()+'"'
  );
  if(blockQuic){
   out.push('add chain=forward src-address='+subnet.trim()+' protocol=udp dst-port=443 action=drop comment="NETFORGE block QUIC UDP 443"');
  }
  out.push('',
   '# IMPORTANT:',
   '# This is domain/IP based blocking, not guaranteed complete app blocking.',
   '# Apps may use changing domains, shared CDN IPs, encrypted DNS/DoH, VPN or IPv6.',
   '# Ensure clients use the router DNS and separately control DoH/DoT and IPv6 if required.',
   '# Domain-resolved IPs can be shared by unrelated services; blocking may affect other sites.',
   '# Place these rules before broad accept rules. Review FastTrack and existing firewall order.',
   '# Test with a small client subnet first; remove only rules with NETFORGE comments to roll back.'
  );
  return out.join('\n');
 },[error,version,selected,subnet,lan,listName,ruleName,blockQuic]);

 const toggle=(id:string)=>{setSelected(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);setGenerated(false);};
 const copy=async()=>{try{await navigator.clipboard.writeText(script);setCopied(true);window.setTimeout(()=>setCopied(false),1600);}catch{setCopied(false);alert('Clipboard tidak tersedia. Salin script secara manual.');}};
 const download=()=>{const u=URL.createObjectURL(new Blob([script],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='netforge-site-app-block.rsc';a.click();URL.revokeObjectURL(u);};
 return <>
  <div className="nt-tool-title"><Shield/><div><span>SECURITY & FIREWALL</span><h2>Block Website & App Generator</h2><p>Pilih layanan yang ingin dibatasi dan buat rule firewall MikroTik.</p></div></div>
  <div className="nt-form-grid two">
   <label>Versi RouterOS<select value={version} onChange={e=>{setVersion(e.target.value);setGenerated(false);}}><option value="7">RouterOS 7.x</option><option value="6">RouterOS 6.49.x</option></select></label>
   <label>Interface LAN / Bridge<input value={lan} onChange={e=>{setLan(e.target.value);setGenerated(false);}}/></label>
   <label>Subnet client yang diblokir<input value={subnet} onChange={e=>{setSubnet(e.target.value);setGenerated(false);}} placeholder="192.168.88.0/24"/></label>
   <label>Address-list name<input value={listName} onChange={e=>{setListName(e.target.value);setGenerated(false);}}/></label>
   <label>Firewall rule comment<input value={ruleName} onChange={e=>{setRuleName(e.target.value);setGenerated(false);}}/></label>
  </div>
  <div className="nt-section-head"><div><span>SELECT BLOCK TARGET</span><h2>Pilih website / aplikasi</h2></div><b>{selected.length} dipilih</b></div>
  <div className="nf-block-grid">
   {services.map(s=><label className="nf-block-option" key={s.id}><input type="checkbox" checked={selected.includes(s.id)} onChange={()=>toggle(s.id)}/><span><b>{s.label}</b><small>{s.domains.length} domain</small></span></label>)}
  </div>
  <label className="nf-block-extra"><input type="checkbox" checked={blockQuic} onChange={e=>{setBlockQuic(e.target.checked);setGenerated(false);}}/><span><b>Blokir QUIC (UDP/443)</b><small>Memaksa sebagian aplikasi/browser mencoba koneksi TCP; tidak menjamin pemblokiran aplikasi.</small></span></label>
  <div className="nt-results two"><div className="nt-result"><small>LAYANAN DIPILIH</small><b>{selected.length}</b></div><div className="nt-result"><small>DOMAIN RULE</small><b>{domains.length}</b></div></div>
  {error&&<div className="nt-alert">{error}</div>}
  <div className="nt-alert">Catatan penting: pemblokiran domain/IP tidak menjamin aplikasi terblokir 100%. Aplikasi dapat memakai CDN, domain baru, DNS terenkripsi, VPN, atau IPv6. Domain CDN bersama juga berpotensi mengganggu layanan lain. Uji pada satu subnet/client terlebih dahulu.</div>
  <div className="nt-script-actions">
   <button onClick={()=>{setGenerated(true);recordToolUse();}} disabled={!!error}>Generate Script</button>
   <button className="nt-button-light" onClick={()=>{setSelected([]);setGenerated(false);setCopied(false);}}><Trash2 size={15}/> Clear</button>
   <button className="nt-button-light" onClick={copy} disabled={!generated||!!error}><Clipboard size={15}/>{copied?'Copied':'Copy'}</button>
   <button className="nt-button-light" onClick={download} disabled={!generated||!!error}><Download size={15}/> Download .rsc</button>
  </div>
  {generated&&!error&&<><div className="nt-alert">Script dibuat. Sebelum impor, pastikan subnet client benar, rule ditempatkan sebelum rule accept yang relevan, dan konfigurasi DNS/IPv6 sudah dipahami.</div><pre className="nt-code"><code>{script}</code></pre></>}
  <p className="nt-disclaimer">Generator menghasilkan rule firewall berbasis domain/IP untuk RouterOS v6.49.x dan v7.x. Efektivitas bergantung pada DNS client, urutan firewall, FastTrack, IPv6, dan pola koneksi aplikasi.</p>
 </>;
}
