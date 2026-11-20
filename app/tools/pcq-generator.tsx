'use client';

import { useMemo, useState } from 'react';
import { Clipboard, Download, Gauge, Router } from 'lucide-react';
import { recordToolUse } from './usage-counter';

const tokenOK=(v:string)=>/^[a-zA-Z0-9_.:-]{1,32}$/.test(v.trim());
const cidrOK=(v:string)=>{
  const p=v.trim().split('/');
  if(p.length!==2)return false;
  const octets=p[0].split('.');
  return octets.length===4&&octets.every(x=>/^\d{1,3}$/.test(x)&&Number(x)<=255)&&/^\d{1,2}$/.test(p[1])&&Number(p[1])<=32;
};
const rateOK=(v:string)=>/^\d+(\.\d+)?[kKmMgG]?$/.test(v.trim());

export default function PcqGenerator(){
  const [mode,setMode]=useState('tree');
  const [version,setVersion]=useState('7');
  const [parent,setParent]=useState('global');
  const [target,setTarget]=useState('192.168.88.0/24');
  const [localList,setLocalList]=useState('NETFORGE-PCQ-LOCAL');
  const [upName,setUpName]=useState('Upload-Client');
  const [downName,setDownName]=useState('Download-Client');
  const [upMark,setUpMark]=useState('upload-client');
  const [downMark,setDownMark]=useState('download-client');
  const [upMax,setUpMax]=useState('10M');
  const [downMax,setDownMax]=useState('50M');
  const [pcqUp,setPcqUp]=useState('PCQ-Up');
  const [pcqDown,setPcqDown]=useState('PCQ-Down');
  const [upRate,setUpRate]=useState('512K');
  const [downRate,setDownRate]=useState('1M');
  const [shared,setShared]=useState(false);
  const [generated,setGenerated]=useState(false);
  const [copied,setCopied]=useState(false);

  const error=useMemo(()=>{
    if(!cidrOK(target))return 'Target harus berupa subnet IPv4/CIDR yang valid.';
    if(!tokenOK(localList)||!tokenOK(upName)||!tokenOK(downName)||!tokenOK(pcqUp)||!tokenOK(pcqDown))return 'Nama queue atau address-list tidak valid.';
    if(mode==='tree'&&!tokenOK(parent))return 'Parent Queue tidak valid.';
    if(!tokenOK(upMark)||!tokenOK(downMark))return 'Packet mark tidak valid.';
    if(!rateOK(upMax)||!rateOK(downMax)||!rateOK(upRate)||!rateOK(downRate))return 'Format bandwidth tidak valid. Contoh: 512K, 10M, 1G.';
    if([upName,downName,pcqUp,pcqDown].some((v,i,a)=>a.indexOf(v)!==i))return 'Nama queue dan PCQ type harus unik.';
    if(upMark===downMark)return 'Upload mark dan download mark harus berbeda.';
    return '';
  },[target,localList,upName,downName,pcqUp,pcqDown,mode,parent,upMark,downMark,upMax,downMax,upRate,downRate]);

  const script=useMemo(()=>{
    if(error)return '';
    const upPcq=shared?'0':upRate.trim();
    const downPcq=shared?'0':downRate.trim();
    const out=[
      '# NETFORGE - MIKROTIK PCQ GENERATOR',
      '# Mode: '+(mode==='tree'?'Queue Tree':'Simple Queue'),
      '# RouterOS '+(version==='7'?'7.x':'6.49.x'),
      '# Upload classifier: src-address | Download classifier: dst-address',
      '# Backup konfigurasi dan periksa target/interface sebelum import.',
      '',
      '/queue type',
      'add name="'+pcqUp.trim()+'" kind=pcq pcq-classifier=src-address pcq-rate='+upPcq+' comment="NETFORGE PCQ Upload"',
      'add name="'+pcqDown.trim()+'" kind=pcq pcq-classifier=dst-address pcq-rate='+downPcq+' comment="NETFORGE PCQ Download"',
    ];
    if(mode==='tree'){
      out.push('','/ip firewall address-list',
        'add list="'+localList.trim()+'" address=10.0.0.0/8 comment="NETFORGE PCQ private LAN"',
        'add list="'+localList.trim()+'" address=172.16.0.0/12 comment="NETFORGE PCQ private LAN"',
        'add list="'+localList.trim()+'" address=192.168.0.0/16 comment="NETFORGE PCQ private LAN"',
        'add list="'+localList.trim()+'" address='+target.trim()+' comment="NETFORGE PCQ target subnet"',
        '',
        '/ip firewall mangle',
        'add chain=forward src-address-list="'+localList.trim()+'" action=mark-packet new-packet-mark="'+upMark.trim()+'" passthrough=no comment="NETFORGE PCQ upload"',
        'add chain=forward dst-address-list="'+localList.trim()+'" action=mark-packet new-packet-mark="'+downMark.trim()+'" passthrough=no comment="NETFORGE PCQ download"',
        '',
        '/queue tree',
        'add name="'+parent.trim()+'" parent=global comment="NETFORGE PCQ parent"',
        'add name="'+upName.trim()+'" parent="'+parent.trim()+'" packet-mark="'+upMark.trim()+'" queue="'+pcqUp.trim()+'" max-limit='+upMax.trim()+' comment="NETFORGE PCQ upload"',
        'add name="'+downName.trim()+'" parent="'+parent.trim()+'" packet-mark="'+downMark.trim()+'" queue="'+pcqDown.trim()+'" max-limit='+downMax.trim()+' comment="NETFORGE PCQ download"'
      );
    }else{
      out.push('','/queue simple',
        'add name="'+upName.trim()+'" target='+target.trim()+' max-limit='+upMax.trim()+'/'+downMax.trim()+' queue="'+pcqUp.trim()+'/'+pcqDown.trim()+'" comment="NETFORGE PCQ Simple Queue"'
      );
    }
    out.push('',
      '# PCQ rate=0 means no fixed per-subqueue rate; clients share available parent/queue bandwidth up to max-limit.',
      '# Queue Tree packet marks apply to forwarded traffic for the configured private address ranges and target subnet.',
      '# Simple Queue uses target subnet and upload/download queue types; max-limit is upload/download.',
      '# Review existing queue names, packet marks, firewall mangle order and FastTrack interaction before import.',
      '# Test in Safe Mode/lab first. This generator does not remove existing configuration.'
    );
    return out.join('\n');
  },[error,mode,version,pcqUp,pcqDown,shared,upRate,downRate,localList,target,upMark,downMark,parent,upName,downName,upMax,downMax]);

  const copy=async()=>{
    try{await navigator.clipboard.writeText(script);setCopied(true);window.setTimeout(()=>setCopied(false),1600);}
    catch{setCopied(false);alert('Clipboard tidak tersedia. Salin script secara manual.');}
  };
  const download=()=>{
    const url=URL.createObjectURL(new Blob([script],{type:'text/plain;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='netforge-mikrotik-pcq-'+(mode==='tree'?'queue-tree':'simple-queue')+'.rsc';a.click();URL.revokeObjectURL(url);
  };
  return <>
    <div className="nt-tool-title"><Router/><div><span>BANDWIDTH & QoS</span><h2>{mode==='simple'?'Simple Queue Generator':'PCQ Generator'}</h2><p>{mode==='simple'?'Generate konfigurasi Simple Queue untuk target subnet dengan pembagian bandwidth PCQ.':'Generate konfigurasi PCQ untuk Queue Tree dan pengaturan bandwidth per client.'}</p></div></div>
    <div className="nt-form-grid two">
      <label>Queue Option<select value={mode} onChange={e=>{setMode(e.target.value);setGenerated(false);}}><option value="tree">Queue Tree</option><option value="simple">Simple Queue</option></select></label>
      <label>Versi RouterOS<select value={version} onChange={e=>{setVersion(e.target.value);setGenerated(false);}}><option value="7">RouterOS 7.x</option><option value="6">RouterOS 6.49.x</option></select></label>
      {mode==='tree'?<label>Parent Name Queue<input value={parent} onChange={e=>{setParent(e.target.value);setGenerated(false);}} placeholder="global / interface"/></label>:<label>Target subnet / CIDR<input value={target} onChange={e=>{setTarget(e.target.value);setGenerated(false);}} placeholder="192.168.88.0/24"/></label>}
      <label>Sub Queue TX (Upload)<input value={upName} onChange={e=>{setUpName(e.target.value);setGenerated(false);}}/></label>
      <label>Sub Queue RX (Download)<input value={downName} onChange={e=>{setDownName(e.target.value);setGenerated(false);}}/></label>
      <label>TX Max-Limit (Upload)<input value={upMax} onChange={e=>{setUpMax(e.target.value);setGenerated(false);}} placeholder="10M"/></label>
      <label>RX Max-Limit (Download)<input value={downMax} onChange={e=>{setDownMax(e.target.value);setGenerated(false);}} placeholder="50M"/></label>
    </div>
    <div className="nt-section-head"><div><span>PCQ CUSTOM CONFIGURATION</span><h2>Setup PCQ untuk setiap client</h2></div></div>
    <div className="nt-form-grid two">
      <label>PCQ TX Name<input value={pcqUp} onChange={e=>{setPcqUp(e.target.value);setGenerated(false);}}/></label>
      <label>PCQ RX Name<input value={pcqDown} onChange={e=>{setPcqDown(e.target.value);setGenerated(false);}}/></label>
      <label>TX Limit / Client<input value={upRate} disabled={shared} onChange={e=>{setUpRate(e.target.value);setGenerated(false);}} placeholder="512K"/></label>
      <label>RX Limit / Client<input value={downRate} disabled={shared} onChange={e=>{setDownRate(e.target.value);setGenerated(false);}} placeholder="1M"/></label>
      {mode==='tree'&&<label>Address List Name<input value={localList} onChange={e=>{setLocalList(e.target.value);setGenerated(false);}}/></label>}
      {mode==='tree'&&<label>Target subnet / CIDR<input value={target} onChange={e=>{setTarget(e.target.value);setGenerated(false);}} placeholder="192.168.88.0/24"/></label>}
    </div>
    <label style={{display:'flex',alignItems:'center',gap:9,fontSize:12,margin:'8px 0 14px'}}><input type="checkbox" checked={shared} onChange={e=>{setShared(e.target.checked);setGenerated(false);}}/> Auto Set BW Shared (UPto available max-limit)</label>
    {error&&<div className="nt-alert">{error}</div>}
    <div className="nt-script-actions">
      <button onClick={()=>{setGenerated(true);recordToolUse();}} disabled={!!error}><Gauge size={15}/> Generate</button>
      <button className="nt-button-light" onClick={()=>{setGenerated(false);setCopied(false);}}><Router size={15}/> Clear</button>
      <button className="nt-button-light" onClick={copy} disabled={!generated||!!error}><Clipboard size={15}/>{copied?'Copied':'Copy'}</button>
      <button className="nt-button-light" onClick={download} disabled={!generated||!!error}><Download size={15}/> Download .rsc</button>
    </div>
    {generated&&!error&&<><div className="nt-alert">Script siap. Pastikan target subnet, parent queue, max-limit, dan urutan mangle sesuai topologi. Periksa FastTrack karena dapat melewati pemrosesan queue/mangle tertentu. Backup dan uji di Safe Mode sebelum produksi.</div><pre className="nt-code"><code>{script}</code></pre></>}
    <p className="nt-disclaimer">PCQ membagi bandwidth per alamat IP berdasarkan classifier. Pada Queue Tree, parent global membatasi trafik agregat; pada Simple Queue, target adalah subnet yang dipilih. Pastikan konfigurasi sesuai kebutuhan dan versi RouterOS.</p>
  </>;
}
