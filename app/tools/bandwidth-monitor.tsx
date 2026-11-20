'use client';

import { useMemo, useState } from 'react';
import { Activity, Clipboard, Download, Gauge, Plus, RotateCcw, Trash2, Wifi } from 'lucide-react';
import { recordToolUse } from './usage-counter';

type Wan = { id:number; label:string; iface:string; quota:string };
const initial:Wan[]=[
  {id:1,label:'ISP 1',iface:'ether1',quota:'500'},
  {id:2,label:'ISP 2',iface:'ether2',quota:'500'},
];
const tokenOK=(v:string)=>/^[a-zA-Z0-9_.:-]{1,32}$/.test(v.trim());
const validWan=(w:Wan)=>tokenOK(w.label)&&tokenOK(w.iface)&&/^\d+(\.\d+)?$/.test(w.quota)&&Number(w.quota)>0;

export default function BandwidthMonitorGenerator(){
  const [version,setVersion]=useState('7');
  const [wans,setWans]=useState<Wan[]>(initial);
  const [interval,setIntervalValue]=useState('00:00:30');
  const [monthStart,setMonthStart]=useState('1');
  const [alertPercent,setAlertPercent]=useState('80');
  const [generated,setGenerated]=useState(false);
  const [copied,setCopied]=useState(false);
  const [nextId,setNextId]=useState(3);

  const error=wans.length<2?'Tambahkan minimal dua interface ISP.'
    :wans.length>8?'Maksimal delapan interface ISP.'
    :wans.some(w=>!validWan(w))?'Periksa label ISP, nama interface, dan kuota setiap ISP.'
    :new Set(wans.map(w=>w.iface)).size!==wans.length?'Interface ISP tidak boleh duplikat.'
    :!/^\d+$/.test(monthStart)||Number(monthStart)<1||Number(monthStart)>28?'Tanggal reset harus antara 1–28.'
    :!/^\d+$/.test(alertPercent)||Number(alertPercent)<1||Number(alertPercent)>100?'Ambang peringatan harus 1–100%.'
    :!['00:00:30','00:01:00','00:05:00'].includes(interval)?'Interval monitoring tidak valid.':'';

  const updateWan=(id:number,key:keyof Wan,value:string)=>{setWans(old=>old.map(w=>w.id===id?{...w,[key]:value}:w));setGenerated(false);};
  const addWan=()=>{if(wans.length<8){setWans(old=>[...old,{id:nextId,label:'ISP '+(old.length+1),iface:'ether'+(old.length+1),quota:'500'}]);setNextId(v=>v+1);setGenerated(false);}};
  const removeWan=(id:number)=>{if(wans.length>2){setWans(old=>old.filter(w=>w.id!==id));setGenerated(false);}};

  const script=useMemo(()=>{
    if(error)return '';
    const names=wans.map(w=>'nf_'+w.id);
    const out:string[]=[
      '# NETFORGE - MULTI ISP BANDWIDTH & QUOTA MONITOR',
      '# RouterOS '+(version==='7'?'7.x':'6.49.x'),
      '# '+wans.map(w=>w.label+'='+w.iface+' ('+w.quota+' GB)').join(' | '),
      '# Counters accumulate RX and TX per ISP; monthly quota is tracked independently.',
      '# Install once. Check script/scheduler names before re-importing.',
      '',
      '/system script',
    ];
    wans.forEach((w,i)=>{
      const n=names[i];
      out.push('add name="NETFORGE-MON-'+w.id+'" policy=read,write,test source={');
      out.push(':local iface "'+w.iface+'"');
      out.push(':local quota '+Number(w.quota));
      out.push(':local warning ('+Number(w.quota)+' * '+Number(alertPercent)+' / 100)');
      out.push(':local rx [/interface get [find where name=$iface] rx-byte]');
      out.push(':local tx [/interface get [find where name=$iface] tx-byte]');
      out.push(':global '+n+'_rx');
      out.push(':global '+n+'_tx');
      out.push(':global '+n+'_lastRx');
      out.push(':global '+n+'_lastTx');
      out.push(':if ([:typeof $'+n+'_rx] = "nothing") do={ :set '+n+'_rx 0 }');
      out.push(':if ([:typeof $'+n+'_tx] = "nothing") do={ :set '+n+'_tx 0 }');
      out.push(':if ([:typeof $'+n+'_lastRx] = "nothing") do={ :set '+n+'_lastRx $rx }');
      out.push(':if ([:typeof $'+n+'_lastTx] = "nothing") do={ :set '+n+'_lastTx $tx }');
      out.push(':if ($rx < $'+n+'_lastRx) do={ :set '+n+'_rx ($'+n+'_rx + $'+n+'_lastRx) }');
      out.push(':if ($tx < $'+n+'_lastTx) do={ :set '+n+'_tx ($'+n+'_tx + $'+n+'_lastTx) }');
      out.push(':set '+n+'_lastRx $rx');
      out.push(':set '+n+'_lastTx $tx');
      out.push(':local totalBytes ($'+n+'_rx + $rx + $'+n+'_tx + $tx)');
      out.push(':local usedGB ($totalBytes / 1073741824)');
      out.push(':local percent ($usedGB * 100 / $quota)');
      out.push(':log warning ("NETFORGE | '+w.label+' | IF="+$iface+" | RX="+(($'+n+'_rx + $rx)/1073741824)+" GB | TX="+(($'+n+'_tx + $tx)/1073741824)+" GB | TOTAL="+$usedGB+" GB | QUOTA="+$quota+" GB | USED="+$percent+"%")');
      out.push(':if ($usedGB >= $warning) do={ :log warning ("NETFORGE WARNING | '+w.label+' quota reached "+$percent+"%") }');
      out.push('/interface monitor-traffic [find where name=$iface] once do={ :log info ("NETFORGE LIVE | '+w.label+' | RX="+(rx-bits-per-second/1000)+" Kbps | TX="+(tx-bits-per-second/1000)+" Kbps") }');
      out.push('}');
    });
    out.push('','/system scheduler');
    wans.forEach(w=>out.push('add name="NETFORGE-SCH-'+w.id+'" interval='+interval+' start-time=startup on-event="/system script run NETFORGE-MON-'+w.id+'" policy=read,write,test'));
    wans.forEach(w=>{
      const n=names[wans.findIndex(x=>x.id===w.id)];
      out.push('');
      out.push('/system script');
      out.push('add name="NETFORGE-RESET-'+w.id+'" policy=read,write,test source={');
      out.push(':global '+n+'_rx 0');
      out.push(':global '+n+'_tx 0');
      out.push(':global '+n+'_lastRx [/interface get [find where name="'+w.iface+'"] rx-byte]');
      out.push(':global '+n+'_lastTx [/interface get [find where name="'+w.iface+'"] tx-byte]');
      out.push('}');
      out.push('/system scheduler');
      out.push('add name="NETFORGE-RESET-SCH-'+w.id+'" start-date='+monthStart+' start-time=00:00:10 interval=1d on-event="/system script run NETFORGE-RESET-'+w.id+'" policy=read,write,test');
    });
    out.push('','/system script');
    out.push('add name=NETFORGE-MONITOR-ALL policy=read,write,test source={');
    wans.forEach(w=>out.push('/system script run NETFORGE-MON-'+w.id));
    out.push('}');
    out.push('/system scheduler');
    out.push('add name=NETFORGE-MONITOR-ALL-SCH interval='+interval+' start-time=startup on-event="/system script run NETFORGE-MONITOR-ALL" policy=read,write,test');
    out.push('','/system script');
    out.push('add name=NETFORGE-RESET-ALL policy=read,write,test source={');
    wans.forEach(w=>out.push('/system script run NETFORGE-RESET-'+w.id));
    out.push('}');
    out.push('/system scheduler');
    out.push('add name=NETFORGE-RESET-ALL-SCH start-date='+monthStart+' start-time=00:00:10 interval=1d on-event="/system script run NETFORGE-RESET-ALL" policy=read,write,test');
    out.push('','/system script');
    out.push('add name=NETFORGE-MONITOR-ALL policy=read,write,test source={');
    wans.forEach(w=>out.push('/system script run NETFORGE-MON-'+w.id));
    out.push('}');
    out.push('# NOTE: Global variables persist only in router runtime and are lost on reboot.');
    out.push('# For reliable month-long totals across reboot, persist counters in files or external collector.');
    out.push('# The monthly reset uses RouterOS scheduler start-date; validate day-of-month behavior on your RouterOS release.');
    out.push('# RX+TX totals count both directions. ISP quota policy may count only download or use a different accounting point.');
    out.push('# Live rates and byte counters are written to RouterOS log; no web dashboard/API connection is included.');
    return out.join('\n');
  },[error,version,wans,interval,monthStart,alertPercent]);

  const preview=wans.reduce((sum,w)=>sum+Number(w.quota||0),0);
  const generate=()=>{if(!error){setGenerated(true);setCopied(false);recordToolUse();}};
  const copy=async()=>{try{await navigator.clipboard.writeText(script);setCopied(true);window.setTimeout(()=>setCopied(false),1400);}catch{setCopied(false);alert('Clipboard tidak tersedia. Salin script secara manual.');}};
  const download=()=>{const url=URL.createObjectURL(new Blob([script],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='netforge-multi-isp-bandwidth-monitor.rsc';a.click();URL.revokeObjectURL(url);};
  const clear=()=>{setWans(initial);setVersion('7');setIntervalValue('00:00:30');setMonthStart('1');setAlertPercent('80');setGenerated(false);setCopied(false);setNextId(3);};

  return <>
    <div className="nt-tool-title"><Activity/><div><span>MONITORING</span><h2>MikroTik Multi-ISP Bandwidth Monitor</h2><p>Pantau RX/TX dan estimasi pemakaian kuota untuk ISP 1, ISP 2, hingga 8 koneksi.</p></div></div>
    <div className="nt-form-grid two">
      <label>Versi RouterOS<select value={version} onChange={e=>{setVersion(e.target.value);setGenerated(false);}}><option value="7">RouterOS 7.x</option><option value="6">RouterOS 6.49.x</option></select></label>
      <label>Interval monitoring<select value={interval} onChange={e=>{setIntervalValue(e.target.value);setGenerated(false);}}><option value="00:00:30">30 detik</option><option value="00:01:00">1 menit</option><option value="00:05:00">5 menit</option></select></label>
      <label>Tanggal reset bulanan<select value={monthStart} onChange={e=>{setMonthStart(e.target.value);setGenerated(false);}}>{Array.from({length:28},(_,i)=><option key={i+1} value={i+1}>{i+1} setiap bulan</option>)}</select></label>
      <label>Ambang peringatan kuota (%)<input type="number" min="1" max="100" value={alertPercent} onChange={e=>{setAlertPercent(e.target.value);setGenerated(false);}}/></label>
    </div>
    <div className="nt-section-head" style={{marginTop:20}}><div><span>WAN / ISP INTERFACES</span><h2>Daftar koneksi internet</h2></div><b>{wans.length} / 8 ISP</b></div>
    <div className="nf-monitor-wans">
      {wans.map((w,i)=><div className="nf-monitor-wan" key={w.id}>
        <div className="nf-monitor-wan-head"><b>{w.label}</b><button onClick={()=>removeWan(w.id)} disabled={wans.length<=2} aria-label={'Hapus '+w.label}><Trash2 size={14}/></button></div>
        <label>Label ISP<input value={w.label} onChange={e=>updateWan(w.id,'label',e.target.value)}/></label>
        <label>Interface MikroTik<input value={w.iface} onChange={e=>updateWan(w.id,'iface',e.target.value)} placeholder="ether1 / pppoe-out1"/></label>
        <label>Kuota bulanan (GB)<input type="number" min="1" step="1" value={w.quota} onChange={e=>updateWan(w.id,'quota',e.target.value)}/></label>
        <small>Threshold warning: {(Number(w.quota)*Number(alertPercent)/100).toFixed(1)} GB</small>
      </div>)}
    </div>
    <div className="nt-script-actions"><button onClick={addWan} disabled={wans.length>=8}><Plus size={15}/> Tambah ISP</button></div>
    {error&&<div className="nt-alert">{error}</div>}
    <div className="nt-results three">
      <div className="nt-result"><small>JUMLAH ISP</small><b>{wans.length} Interface</b></div>
      <div className="nt-result"><small>TOTAL KUOTA GABUNGAN</small><b>{preview.toLocaleString('id-ID')} GB</b></div>
      <div className="nt-result"><small>INTERVAL MONITORING</small><b>{interval==='00:00:30'?'30s':interval==='00:01:00'?'1m':'5m'}</b></div>
    </div>
    <div className="nt-script-actions">
      <button onClick={generate} disabled={!!error}><Gauge size={15}/> Generate Script</button>
      <button className="nt-button-light" onClick={copy} disabled={!generated||!!error}><Clipboard size={15}/>{copied?'Tersalin':'Copy Script'}</button>
      <button className="nt-button-light" onClick={download} disabled={!generated||!!error}><Download size={15}/> Unduh .rsc</button>
      <button className="nt-button-light" onClick={clear}><RotateCcw size={15}/> Reset</button>
    </div>
    {generated&&<><div className="nt-alert">Script multi-ISP dibuat. Counter dihitung per interface dan kuota masing-masing ISP. Pastikan setiap interface benar dan uji script di router lab sebelum produksi. Catatan: global variable runtime dapat hilang ketika router reboot; untuk akumulasi bulanan yang tahan reboot diperlukan penyimpanan persisten tambahan.</div><div className="nt-section-head"><div><span>ROUTEROS SCRIPT</span><h2>Multi-ISP Bandwidth Monitor</h2></div></div><pre className="nt-code"><code>{script}</code></pre></>}
    <div className="nt-note"><Wifi size={16}/> Generator ini menjalankan monitoring dan pencatatan di RouterOS. Hasil ditulis ke log MikroTik, bukan dipantau langsung dari website. Dashboard web real-time membutuhkan backend/API dan tidak tersedia pada GitHub Pages statis.</div>
  </>;
}
