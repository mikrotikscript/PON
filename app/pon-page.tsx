'use client';

import { useMemo, useState } from 'react';
import { Activity, ArrowRight, Cable, CheckCircle2, Info, Moon, Network, RotateCcw, Sun, Waves, Zap, Trash2 } from 'lucide-react';

type Tab = 'topology' | 'splitter' | 'standard';
type Kind = 'fiber' | 'splice' | 'connector' | 'plc' | 'fbt' | 'ont';
type NodeItem = {
  id: number;
  kind: Kind;
  lengthKm?: number;
  loss?: number;
  plcPorts?: number;
  fbtDrop?: number;
};

const plcLoss: Record<number, number> = { 2: 3.7, 4: 7.4, 8: 10.7, 16: 14.0, 32: 17.3 };
const names: Record<Kind, string> = {
  fiber: 'Kabel Fiber Optik',
  splice: 'Sambungan (Splice)',
  connector: 'Konektor / Adapter',
  plc: 'Splitter PLC (Merata)',
  fbt: 'Splitter FBT (Rasio)',
  ont: 'ONT / ONU (Modem)',
};
const fmt = (v: number) => `${v.toFixed(2)} dBm`;
const fbtDropLoss = (drop: number) => -10 * Math.log10(drop / 100) + 0.5;
const fbtPassLoss = (drop: number) => -10 * Math.log10((100 - drop) / 100) + 0.14;

export default function Home() {
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState<Tab>('topology');
  const [input, setInput] = useState('7');
  const [kind, setKind] = useState<Kind>('fiber');
  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [nextId, setNextId] = useState(1);
  const [splitterInput, setSplitterInput] = useState('3.5');
  const [splitterDrop, setSplitterDrop] = useState(10);
  const [splitterPlc, setSplitterPlc] = useState(8);

  const addNode = () => {
    const defaults: Record<Kind, Partial<NodeItem>> = {
      fiber: { lengthKm: 1, loss: 0.35 },
      splice: { loss: 0.10 },
      connector: { loss: 0.30 },
      plc: { plcPorts: 8, loss: 10.7 },
      fbt: { fbtDrop: 10 },
      ont: { loss: 0 },
    };
    setNodes(current => [...current, { id: nextId, kind, ...defaults[kind] }]);
    setNextId(value => value + 1);
  };

  const updateNode = (id: number, patch: Partial<NodeItem>) =>
    setNodes(current => current.map(item => item.id === id ? { ...item, ...patch } : item));
  const removeNode = (id: number) => setNodes(current => current.filter(item => item.id !== id));
  const reset = () => { setNodes([]); setInput('7'); setNextId(1); };

  const results = useMemo(() => {
    const source = Number(input);
    if (input.trim() === '' || !Number.isFinite(source)) return [];
    let continuingPower = source;
    let accumulatedLoss = 0;
    return nodes.map(node => {
      const inputPower = continuingPower;
      let loss = node.loss ?? 0;
      let dropPower: number | null = null;
      let passPower: number | null = null;
      if (node.kind === 'fiber') loss = (node.lengthKm ?? 0) * (node.loss ?? 0.35);
      if (node.kind === 'fbt') {
        const drop = node.fbtDrop ?? 10;
        dropPower = inputPower - fbtDropLoss(drop);
        passPower = inputPower - fbtPassLoss(drop);
        loss = fbtPassLoss(drop);
        continuingPower = passPower;
      } else if (node.kind === 'ont') {
        loss = 0;
      } else {
        continuingPower = inputPower - loss;
      }
      accumulatedLoss = source - continuingPower;
      return { id: node.id, inputPower, loss, outputPower: node.kind === 'fbt' ? passPower! : continuingPower, dropPower, passPower, accumulatedLoss };
    });
  }, [input, nodes]);

  const sourcePower = Number(input);
  const validInput = input.trim() !== '' && Number.isFinite(sourcePower);
  const finalPower = results.length ? results[results.length - 1].outputPower : sourcePower;
  const totalLoss = validInput ? sourcePower - finalPower : 0;

  const splitResult = useMemo(() => {
    const power = Number(splitterInput);
    if (splitterInput.trim() === '' || !Number.isFinite(power)) return null;
    const plc = plcLoss[splitterPlc];
    const dropLoss = fbtDropLoss(splitterDrop);
    const passLoss = fbtPassLoss(splitterDrop);
    return {
      dropLoss, passLoss, plc,
      dropRx: power - dropLoss - plc,
      passRx: power - passLoss,
    };
  }, [splitterInput, splitterDrop, splitterPlc]);

  const rxCategory = (rx: number) => {
    if (rx > -8) return ['OVERLOAD', 'danger'];
    if (rx >= -23 && rx <= -15) return ['SANGAT BAIK', 'good'];
    if (rx >= -26 && rx <= -24) return ['KRITIS', 'warning'];
    if (rx < -27) return ['LOS / DI BAWAH BATAS', 'danger'];
    return ['DI LUAR RENTANG TARGET', 'warning'];
  };

  return (
    <main className={dark ? 'pon-app dark' : 'pon-app'}>
      <header className="pon-topbar">
        <div className="pon-brand"><span className="pon-brand-icon"><Waves size={20}/></span><div><b>PON<span>CALC</span></b><small>FTTH & PON TOOLS</small></div></div>
        <button className="pon-theme" onClick={() => setDark(!dark)} aria-label="Ganti tema">{dark ? <Sun size={18}/> : <Moon size={18}/>}</button>
      </header>

      <div className="pon-shell">
        <section className="pon-hero">
          <div><div className="pon-eyebrow"><Zap size={13}/> PON CALCULATOR</div><h1>Kalkulator Redaman & Link Budget PON</h1><p>Bangun topologi FTTH, tambahkan komponen, dan hitung daya optik setiap titik secara otomatis.</p></div>
          <nav className="pon-tabs">
            <button className={tab === 'topology' ? 'active' : ''} onClick={() => setTab('topology')}><Network size={15}/> Topologi</button>
            <button className={tab === 'splitter' ? 'active' : ''} onClick={() => setTab('splitter')}><Activity size={15}/> Splitter Pintar</button>
            <button className={tab === 'standard' ? 'active' : ''} onClick={() => setTab('standard')}><Info size={15}/> Standar Rx</button>
          </nav>
        </section>

        {tab === 'topology' && <section className="pon-panel">
          <div className="pon-panel-head"><div><span className="pon-step">DESAIN JARINGAN</span><h2>Topologi & Perhitungan Redaman</h2><p>Setiap komponen menerima daya dari keluaran komponen sebelumnya.</p></div><button className="pon-secondary" onClick={reset}><RotateCcw size={14}/> Reset</button></div>
          <div className="pon-source">
            <div className="pon-source-title"><Zap size={16}/> Sumber Input (OLT / ODC / ODP)</div>
            <div className="pon-source-grid">
              <label>Daya Input TX (dBm)<input type="number" step="0.01" value={input} onChange={e => setInput(e.target.value)}/></label>
              <div className="pon-metric"><small>SINYAL KELUARAN SAAT INI</small><b>{validInput ? fmt(finalPower) : '—'}</b></div>
              <div className="pon-metric"><small>REDAMAN TOTAL (LOSS)</small><b>{validInput ? `${totalLoss.toFixed(2)} dB` : '—'}</b></div>
            </div>
          </div>

          <div className="pon-chain">
            <div className="pon-chain-start"><span><Zap size={17}/></span><div><b>OLT / FEEDER</b><small>{validInput ? fmt(sourcePower) : 'Input tidak valid'}</small></div></div>
            {nodes.length === 0 && <div className="pon-empty">Belum ada komponen. Pilih komponen pada menu Tambah Cabang untuk mulai membangun topologi.</div>}
            {nodes.map((node, index) => {
              const result = results[index];
              const drop = node.fbtDrop ?? 10;
              return <article className={`pon-node pon-node-${node.kind}`} key={node.id}>
                <div className="pon-node-head"><div><span className="pon-node-index">{index + 1}</span><b>{names[node.kind]}</b></div><button className="pon-delete" onClick={() => removeNode(node.id)}><Trash2 size={13}/> Hapus</button></div>
                <div className="pon-node-metrics">
                  <div><small>INPUT POWER</small><b>{result ? fmt(result.inputPower) : '—'}</b></div>
                  <div><small>REDAMAN (LOSS)</small><b>{node.kind === 'fbt' ? `D: ${fbtDropLoss(drop).toFixed(2)} | P: ${fbtPassLoss(drop).toFixed(2)} dB` : `${(result?.loss ?? 0).toFixed(2)} dB`}</b></div>
                </div>

                {node.kind === 'fiber' && <div className="pon-fields">
                  <label>Panjang Kabel (km)<input type="number" min="0" step="0.01" value={node.lengthKm ?? 1} onChange={e => updateNode(node.id,{lengthKm:Number(e.target.value)})}/></label>
                  <label>Redaman (dB/km)<input type="number" min="0" step="0.01" value={node.loss ?? 0.35} onChange={e => updateNode(node.id,{loss:Number(e.target.value)})}/></label>
                </div>}
                {(node.kind === 'splice' || node.kind === 'connector') && <div className="pon-fields">
                  <label>Redaman {node.kind === 'splice' ? 'Splice' : 'Konektor'} (dB)<input type="number" min="0" step="0.01" value={node.loss ?? (node.kind === 'splice' ? 0.1 : 0.3)} onChange={e => updateNode(node.id,{loss:Number(e.target.value)})}/></label>
                </div>}
                {node.kind === 'plc' && <div className="pon-fields">
                  <label>Rasio Output (1:N)<select value={node.plcPorts ?? 8} onChange={e => { const ports = Number(e.target.value); updateNode(node.id,{plcPorts:ports,loss:plcLoss[ports]}); }}>{[2,4,8,16,32].map(port=><option key={port} value={port}>1 : {port}</option>)}</select></label>
                  <label>Redaman Splitter (dB)<input type="number" min="0" step="0.01" value={node.loss ?? 10.7} onChange={e => updateNode(node.id,{loss:Number(e.target.value)})}/></label>
                </div>}
                {node.kind === 'fbt' && <div className="pon-fields">
                  <label>Rasio Drop / Pass<select value={drop} onChange={e => updateNode(node.id,{fbtDrop:Number(e.target.value)})}>{Array.from({length:50},(_,i)=>i+1).map(v=><option key={v} value={v}>{v}% (Drop) / {100-v}% (Pass)</option>)}</select></label>
                  <div className="pon-fbt-outputs">
                    <div><small>LOSS JALUR DROP</small><b>{fbtDropLoss(drop).toFixed(2)} dB</b><small>DAYA DROP</small><strong>{result ? fmt(result.dropPower ?? 0) : '—'}</strong></div>
                    <div><small>LOSS JALUR PASS</small><b>{fbtPassLoss(drop).toFixed(2)} dB</b><small>DAYA PASS (LANJUTAN)</small><strong>{result ? fmt(result.passPower ?? 0) : '—'}</strong></div>
                  </div>
                </div>}
                {node.kind === 'ont' && <div className="pon-ont-readout"><CheckCircle2 size={15}/> Estimasi daya terima ONT: <b>{result ? fmt(result.inputPower) : '—'}</b></div>}
                <div className="pon-node-output"><span>{node.kind === 'fbt' ? 'Sinyal keluaran jalur Pass (lanjutan)' : 'Sinyal keluaran'}</span><b>{result ? fmt(result.outputPower) : '—'}</b></div>
              </article>;
            })}
          </div>

          <div className="pon-add-row">
            <label className="pon-add-select"><span>Komponen berikutnya</span><select value={kind} onChange={e => setKind(e.target.value as Kind)}>
              <option value="fiber">Kabel Fiber Optik</option><option value="splice">Sambungan (Splice)</option><option value="connector">Konektor / Adapter</option><option value="plc">Splitter PLC (Merata)</option><option value="fbt">Splitter FBT (Rasio)</option><option value="ont">ONT / ONU (Modem)</option>
            </select></label>
            <button className="pon-primary" onClick={addNode}>+ Tambah Cabang</button>
          </div>
          <div className="pon-note"><Info size={16}/> FBT membagi daya menjadi dua jalur. Drop ditampilkan sebagai cabang pelanggan, sedangkan Pass menjadi jalur lanjutan untuk komponen berikutnya. PLC menggunakan redaman tipikal yang dapat diedit. Nilai aktual wajib diverifikasi dengan datasheet dan OPM.</div>
        </section>}

        {tab === 'splitter' && <section className="pon-panel">
          <div className="pon-panel-head"><div><span className="pon-step">SIMULASI SPLITTER</span><h2>Splitter Pintar FBT + PLC</h2><p>Hitung daya keluaran Drop dan Pass serta estimasi Rx setelah PLC.</p></div></div>
          <div className="pon-source-grid pon-split-input">
            <label>Daya Input (dBm)<input type="number" step="0.01" value={splitterInput} onChange={e => setSplitterInput(e.target.value)}/></label>
            <label>Rasio FBT Drop / Pass<select value={splitterDrop} onChange={e => setSplitterDrop(Number(e.target.value))}>{Array.from({length:50},(_,i)=>i+1).map(v=><option key={v} value={v}>{v}% / {100-v}%</option>)}</select></label>
            <label>Splitter PLC<select value={splitterPlc} onChange={e => setSplitterPlc(Number(e.target.value))}>{[2,4,8,16,32].map(v=><option key={v} value={v}>1 : {v}</option>)}</select></label>
          </div>
          {splitResult && <div className="pon-result-grid">
            <div className="pon-result-card"><small>LOSS FBT DROP</small><b>{splitResult.dropLoss.toFixed(2)} dB</b><small>ESTIMASI RX DROP + PLC</small><strong>{fmt(splitResult.dropRx)}</strong><span className={`pon-status ${rxCategory(splitResult.dropRx)[1]}`}>{rxCategory(splitResult.dropRx)[0]}</span></div>
            <div className="pon-result-card"><small>LOSS FBT PASS</small><b>{splitResult.passLoss.toFixed(2)} dB</b><small>DAYA PASS</small><strong>{fmt(splitResult.passRx)}</strong><span className="pon-status">JALUR LANJUTAN</span></div>
            <div className="pon-result-card"><small>LOSS PLC 1:{splitterPlc}</small><b>{splitResult.plc.toFixed(2)} dB</b><small>DAYA DROP SETELAH PLC</small><strong>{fmt(splitResult.dropRx)}</strong></div>
          </div>}
        </section>}

        {tab === 'standard' && <section className="pon-panel">
          <div className="pon-panel-head"><div><span className="pon-step">PANDUAN TEKNISI</span><h2>Standar Daya Terima Rx ONT / ONU</h2><p>Acuan ringkas untuk pemeriksaan awal jaringan FTTH.</p></div></div>
          <div className="pon-standard-grid">
            <div className="pon-standard good"><CheckCircle2/><small>SANGAT BAIK / NORMAL</small><b>-15 s/d -23 dBm</b><p>Rentang operasional yang umum dijadikan acuan awal.</p></div>
            <div className="pon-standard warning"><Info/><small>KRITIS / WARNING</small><b>-24 s/d -26 dBm</b><p>Periksa konektor, tekukan kabel, sambungan, dan jalur distribusi.</p></div>
            <div className="pon-standard danger"><Activity/><small>LOS / OVERLOAD</small><b>&lt; -27 atau &gt; -8 dBm</b><p>Cocokkan batas aktual dengan kelas optik dan datasheet ONT.</p></div>
          </div>
        </section>}

        <footer className="pon-footer"><span>PONCALC · FTTH & PON TOOLS</span><span>Perhitungan estimasi splitter dan redaman jalur</span></footer>
      </div>
    </main>
  );
}
