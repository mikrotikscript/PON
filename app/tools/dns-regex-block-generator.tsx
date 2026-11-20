'use client';
import { useMemo, useState } from 'react';
import { Clipboard, Download, Shield, Trash2 } from 'lucide-react';
import { recordToolUse } from './usage-counter';
const presets=[{label:'Facebook',domain:'facebook.com'},{label:'YouTube',domain:'youtube.com'},{label:'Instagram',domain:'instagram.com'},{label:'TikTok',domain:'tiktok.com'},{label:'WhatsApp',domain:'whatsapp.com'},{label:'X / Twitter',domain:'x.com'},{label:'Telegram',domain:'telegram.org'}];
const validDomain=(v:string)=>/^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/.test(v.trim());
export default function DnsRegexBlockGenerator(){
 const [domains,setDomains]=useState(['facebook.com','youtube.com','instagram.com']);
 const [address,setAddress]=useState('127.0.0.1'),[comment,setComment]=useState('NETFORGE-DNS-BLOCK');
 const [generated,setGenerated]=useState(false),[copied,setCopied]=useState(false),[newDomain,setNewDomain]=useState('');
 const error=useMemo(()=>{if(!domains.length)return 'Tambahkan minimal satu domain.';if(domains.some(d=>!validDomain(d)))return 'Ada domain tidak valid. Contoh: facebook.com';if(!/^(\d{1,3}\.){3}\d{1,3}$/.test(address)||address.split('.').some(n=>Number(n)>255))return 'Alamat redirect harus IPv4 valid.';if(!/^[a-zA-Z0-9_.-]{1,40}$/.test(comment.trim()))return 'Comment hanya boleh berisi huruf, angka, titik, garis bawah, atau strip.';return '';},[domains,address,comment]);
 const script=useMemo(()=>{if(error)return '';const unique=Array.from(new Set(domains.map(d=>d.trim().toLowerCase())));const lines=['# NETFORGE - MIKROTIK DNS REGEX WEBSITE BLOCK GENERATOR','# RouterOS 6.49.x / 7.x','# Redirect matching domain and its subdomains to '+address,'# Ensure clients use the MikroTik DNS resolver.',''];unique.forEach(d=>{const pattern='(^|\\\\.)'+d.replace(/\./g,'\\\\.')+'$';lines.push('/ip dns static add regexp="'+pattern+'" address='+address+' comment="'+comment.trim()+'-'+d+'"');});lines.push('','/ip dns cache flush','','# IMPORTANT:','# Configure DHCP clients to use MikroTik LAN IP as DNS.','# Enable allow-remote-requests only when router is intended to serve client DNS.','# Restrict recursive DNS access to trusted LAN; never expose it to WAN.','# DoH/DoT, VPN, external DNS and IPv6 may bypass this method.','# This matches DNS names, not every IP/API/CDN used by an application.','# Test on a limited client group before production.');return lines.join('\n');},[error,domains,address,comment]);
 const update=(i:number,v:string)=>{setDomains(old=>old.map((d,n)=>n===i?v:d));setGenerated(false);};
 const add=()=>{const d=newDomain.trim().toLowerCase();if(d&&validDomain(d)&&!domains.includes(d)){setDomains(old=>[...old,d]);setNewDomain('');setGenerated(false);}};
 const copy=async()=>{try{await navigator.clipboard.writeText(script);setCopied(true);window.setTimeout(()=>setCopied(false),1500);}catch{alert('Clipboard tidak tersedia. Salin script secara manual.');}};
 const download=()=>{const u=URL.createObjectURL(new Blob([script],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='netforge-dns-regex-block.rsc';a.click();URL.revokeObjectURL(u);};
 return <>
  <div className="nt-tool-title"><Shield/><div><span>SECURITY & BACKUP</span><h2>MikroTik DNS Regex Block Generator</h2><p>Blokir domain dan subdomain menggunakan DNS Static Regex RouterOS.</p></div></div>
  <div className="nt-form-grid two"><label>Redirect IPv4<input value={address} onChange={e=>{setAddress(e.target.value);setGenerated(false);}} placeholder="127.0.0.1"/></label><label>Comment prefix<input value={comment} onChange={e=>{setComment(e.target.value);setGenerated(false);}}/></label></div>
  <div className="nt-section-head"><div><span>QUICK SELECT</span><h2>Pilih domain populer</h2></div></div>
  <div className="nf-block-grid">{presets.map(p=><button type="button" className="nf-block-option" key={p.domain} onClick={()=>{if(!domains.includes(p.domain))setDomains(old=>[...old,p.domain]);setGenerated(false);}}><span><b>+ {p.label}</b><small>{p.domain}</small></span></button>)}</div>
  <div className="nt-section-head"><div><span>DOMAIN LIST</span><h2>Daftar domain yang diblokir</h2></div><b>{domains.length} domain</b></div>
  <div className="nf-dns-domain-list">{domains.map((d,i)=><div className="nf-dns-domain-row" key={i}><input aria-label={'Domain '+(i+1)} value={d} onChange={e=>update(i,e.target.value)} placeholder="contoh.com"/><button type="button" className="nt-button-light" onClick={()=>{setDomains(old=>old.filter((_,n)=>n!==i));setGenerated(false);}}><Trash2 size={14}/> Hapus</button></div>)}</div>
  <div className="nf-dns-add-row"><input value={newDomain} onChange={e=>setNewDomain(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')add();}} placeholder="Tambahkan domain, mis. example.com"/><button type="button" onClick={add} disabled={!validDomain(newDomain.trim())}>+ Add Domain</button></div>
  {error&&<div className="nt-alert">{error}</div>}
  <div className="nt-alert">Domain dan subdomain yang cocok dengan regex diarahkan ke IP redirect. Klien harus menggunakan DNS MikroTik. DNS terenkripsi, VPN, DNS eksternal, dan IPv6 dapat melewati metode ini.</div>
  <div className="nt-script-actions"><button onClick={()=>{setGenerated(true);recordToolUse();}} disabled={!!error}>Generate Script</button><button className="nt-button-light" onClick={()=>{setDomains([]);setGenerated(false);setCopied(false);}}>Clear</button><button className="nt-button-light" onClick={copy} disabled={!generated||!!error}><Clipboard size={15}/>{copied?'Copied':'Copy'}</button><button className="nt-button-light" onClick={download} disabled={!generated||!!error}><Download size={15}/>Download .rsc</button></div>
  {generated&&!error&&<pre className="nt-code"><code>{script}</code></pre>}
  <p className="nt-disclaimer">DNS Static Regex tidak memblokir seluruh koneksi berbasis IP dan tidak menjamin pemblokiran semua fitur aplikasi. Batasi recursive DNS ke LAN dan uji pada client terbatas sebelum penerapan luas.</p>
 </>;
}
