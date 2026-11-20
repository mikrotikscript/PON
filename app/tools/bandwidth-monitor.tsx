'use client';

import { useMemo, useState } from 'react';
import { Activity, Clipboard, Download, Gauge, RotateCcw, Wifi } from 'lucide-react';
import { recordToolUse } from './usage-counter';

const tokenOK = (v: string) => /^[a-zA-Z0-9_.:-]{1,32}$/.test(v.trim());
const byteRate = (n: number) => {
  if (!Number.isFinite(n)) return '0 bps';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + ' Mbps';
  if (n >= 1_000) return (n / 1_000).toFixed(2) + ' Kbps';
  return n.toFixed(0) + ' bps';
};

export default function BandwidthMonitorGenerator() {
  const [iface, setIface] = useState('ether1');
  const [quota, setQuota] = useState('500');
  const [interval, setIntervalValue] = useState('00:00:30');
  const [monthStart, setMonthStart] = useState('1');
  const [alertPercent, setAlertPercent] = useState('80');
  const [routerName, setRouterName] = useState('NETFORGE-MONITOR');
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);

  const numeric = [Number(quota), Number(monthStart), Number(alertPercent)];
  const error = !tokenOK(iface) ? 'Nama interface tidak valid.'
    : !tokenOK(routerName) ? 'Identity label hanya boleh berisi huruf, angka, titik, _ : atau -.'
    : !/^\d+(\.\d+)?$/.test(quota) || numeric[0] <= 0 ? 'Kuota bulanan harus lebih besar dari 0 GB.'
    : !/^\d+$/.test(monthStart) || numeric[1] < 1 || numeric[1] > 28 ? 'Tanggal reset harus antara 1–28.'
    : !/^\d+$/.test(alertPercent) || numeric[2] < 1 || numeric[2] > 100 ? 'Ambang notifikasi harus 1–100%.'
    : !['00:00:30','00:01:00','00:05:00'].includes(interval) ? 'Interval monitoring tidak valid.' : '';

  const scripts = useMemo(() => {
    if (error) return null;
    const mb = Number(quota);
    const threshold = (mb * Number(alertPercent) / 100).toFixed(1);
    const monitor = `:local monitoredInterface "${iface.trim()}"
:local monthlyQuotaGB ${mb}
:local warningPercent ${alertPercent}
:local warningQuotaGB ($monthlyQuotaGB * $warningPercent / 100)
:local currentRx [/interface get [find where name=$monitoredInterface] rx-byte]
:local currentTx [/interface get [find where name=$monitoredInterface] tx-byte]
:local currentTotal ($currentRx + $currentTx)
:local previousRx [:tonum [/system script environment get rxBaseline]]
:local previousTx [:tonum [/system script environment get txBaseline]]
:local previousTotal [:tonum [/system script environment get totalBase]]
:local rxAccum [:tonum [/system script environment get rxAccum]]
:local txAccum [:tonum [/system script environment get txAccum]]
:if ($rxAccum = 0 && $txAccum = 0 && $previousTotal = 0) do={
  :set rxAccum 0
  :set txAccum 0
}
:if ($currentRx < $previousRx) do={ :set rxAccum ($rxAccum + $previousRx) }
:if ($currentTx < $previousTx) do={ :set txAccum ($txAccum + $previousTx) }
:local rxTotal ($rxAccum + $currentRx)
:local txTotal ($txAccum + $currentTx)
:local usedBytes ($rxTotal + $txTotal)
:local usedGB ($usedBytes / 1073741824)
:local usedPercent ($usedGB * 100 / $monthlyQuotaGB)
/system script environment set rxBaseline value=$currentRx
/system script environment set txBaseline value=$currentTx
/system script environment set rxAccum value=$rxAccum
/system script environment set txAccum value=$txAccum
/system script environment set usedGB value=$usedGB
:log warning ("NETFORGE BW | ${monitoredInterface} | RX=" . ($rxTotal / 1073741824) . " GB | TX=" . ($txTotal / 1073741824) . " GB | TOTAL=" . $usedGB . " GB | QUOTA=" . $monthlyQuotaGB . " GB | USED=" . $usedPercent . "%")
:if ($usedGB >= $warningQuotaGB) do={ :log warning ("NETFORGE WARNING: quota usage reached " . $usedPercent . "%") }
/interface monitor-traffic [find where name=$monitoredInterface] once do={
  :log info ("NETFORGE LIVE | RX=" . (rx-bits-per-second / 1000) . " Kbps | TX=" . (tx-bits-per-second / 1000) . " Kbps")
}`;

    const setup = `# NETFORGE - MIKROTIK BANDWIDTH & QUOTA MONITOR
# RouterOS 6.49.x / 7.x (script and scheduler template)
# Interface: ${iface} | Monthly quota: ${mb} GB | Scheduler: ${interval}
# This generator creates a basic interface counter monitor and monthly reset job.
# Review permissions and run once manually before enabling the scheduler.

# 1) Script environment variables (initial baseline and accumulators)
/system script environment
:global rxBaseline 0
:global txBaseline 0
:global rxAccum 0
:global txAccum 0
:global usedGB 0

# 2) Monitoring script
/system script
add name=NETFORGE-BANDWIDTH-MONITOR policy=read,write,test source={
${monitor}
}

# 3) Monitoring scheduler
/system scheduler
add name=NETFORGE-BW-SCHEDULE interval=${interval} start-time=startup on-event="/system script run NETFORGE-BANDWIDTH-MONITOR" policy=read,write,test

# 4) Monthly reset scheduler
/system scheduler
add name=NETFORGE-BW-MONTHLY-RESET start-date=${monthStart} start-time=00:00:10 interval=1d on-event="/system script environment set rxAccum value=0; /system script environment set txAccum value=0; /system script environment set rxBaseline value=[/interface get [find where name=\"${iface}\"] rx-byte]; /system script environment set txBaseline value=[/interface get [find where name=\"${iface}\"] tx-byte]; /system script environment set usedGB value=0" policy=read,write,test

# NOTE:
# - Monthly reset should be scheduled on day ${monthStart}; verify date behavior on your RouterOS build.
# - Interface byte counters reset on reboot/wrap; accumulators attempt to preserve previous totals.
# - RX+TX counts both directions, so quota basis may differ from ISP accounting.
# - For high assurance use a persistent file/database or external collector; scheduler environment is router-local.
# - Do not import twice. Review scheduler names and permissions first.
`;
    return { setup, monitor };
  }, [error, iface, quota, interval, monthStart, alertPercent]);

  const generate = () => { if (!error) { setGenerated(true); setCopied(false); recordToolUse(); } };
  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1400); }
    catch { setCopied(false); alert('Clipboard tidak tersedia. Salin script secara manual.'); }
  };
  const download = () => {
    if (!scripts) return;
    const url = URL.createObjectURL(new Blob([scripts.setup], {type:'text/plain;charset=utf-8'}));
    const a = document.createElement('a'); a.href=url; a.download='netforge-bandwidth-monitor.rsc'; a.click(); URL.revokeObjectURL(url);
  };
  const clear = () => { setIface('ether1'); setQuota('500'); setIntervalValue('00:00:30'); setMonthStart('1'); setAlertPercent('80'); setRouterName('NETFORGE-MONITOR'); setGenerated(false); setCopied(false); };

  return <>
    <div className="nt-tool-title"><Activity/><div><span>MONITORING</span><h2>MikroTik Bandwidth & Quota Monitor</h2><p>Generator script pemantauan RX/TX, kecepatan live, dan estimasi pemakaian kuota bulanan berbasis interface.</p></div></div>
    <div className="nt-form-grid two">
      <label>Interface yang dipantau<input value={iface} onChange={e=>{setIface(e.target.value);setGenerated(false);}} placeholder="ether1 / WAN1"/></label>
      <label>Router Identity Label<input value={routerName} onChange={e=>{setRouterName(e.target.value);setGenerated(false);}}/></label>
      <label>Total kuota bulanan (GB)<input type="number" min="1" step="1" value={quota} onChange={e=>{setQuota(e.target.value);setGenerated(false);}}/></label>
      <label>Ambang peringatan kuota (%)<input type="number" min="1" max="100" value={alertPercent} onChange={e=>{setAlertPercent(e.target.value);setGenerated(false);}}/></label>
      <label>Interval monitoring<select value={interval} onChange={e=>{setIntervalValue(e.target.value);setGenerated(false);}}><option value="00:00:30">30 detik</option><option value="00:01:00">1 menit</option><option value="00:05:00">5 menit</option></select></label>
      <label>Tanggal reset bulanan<select value={monthStart} onChange={e=>{setMonthStart(e.target.value);setGenerated(false);}}>{Array.from({length:28},(_,i)=><option key={i+1} value={i+1}>{i+1} setiap bulan</option>)}</select></label>
    </div>
    {error && <div className="nt-alert">{error}</div>}
    <div className="nt-results three">
      <div className="nt-result"><small>MONTHLY QUOTA</small><b>{Number(quota)>0?Number(quota).toLocaleString('id-ID')+' GB':'—'}</b></div>
      <div className="nt-result"><small>WARNING THRESHOLD</small><b>{Number(quota)>0?(Number(quota)*Number(alertPercent)/100).toFixed(1)+' GB':'—'}</b></div>
      <div className="nt-result"><small>MONITORING INTERVAL</small><b>{interval==='00:00:30'?'30s':interval==='00:01:00'?'1m':'5m'}</b></div>
    </div>
    <div className="nt-script-actions">
      <button onClick={generate} disabled={!!error}><Gauge size={15}/> Generate Script</button>
      <button className="nt-button-light" onClick={()=>copy(scripts?.setup||'')} disabled={!generated||!scripts}><Clipboard size={15}/>{copied?'Tersalin':'Copy Script'}</button>
      <button className="nt-button-light" onClick={download} disabled={!generated||!scripts}><Download size={15}/> Unduh .rsc</button>
      <button className="nt-button-light" onClick={clear}><RotateCcw size={15}/> Reset</button>
    </div>
    {generated && scripts && <>
      <div className="nt-alert">Script dibuat untuk interface {iface}, kuota {quota} GB, interval {interval}. Periksa kembali versi RouterOS, nama interface, permission script, dan scheduler. Import pada router uji terlebih dahulu.</div>
      <div className="nt-section-head"><div><span>ROUTEROS SCRIPT</span><h2>Bandwidth Monitor + Monthly Quota</h2></div></div>
      <pre className="nt-code"><code>{scripts.setup}</code></pre>
    </>}
    <div className="nt-note"><Wifi size={16}/> Generator ini membuat konfigurasi monitor lokal pada RouterOS. Data ditampilkan melalui log router, bukan dashboard real-time website. Pengambilan data live langsung dari router membutuhkan API/backend yang tidak tersedia pada GitHub Pages statis.</div>
  </>;
}
