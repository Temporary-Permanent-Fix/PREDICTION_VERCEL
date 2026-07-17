"use client";
import { useEffect, useMemo, useState } from "react";
import { parseCSV, toCSV } from "../lib/csv";
import {
  TYPY_VYNIMIEK, TYPY_UDALOSTI, buildDaily, mergedHourly, fitModel, predictDay,
  expectedFor, hourlyProfile, eventMult, intraday, cumProfile, predictZvoz,
  addDays, dow, DNI, fmtD, iso,
} from "../lib/model";

const nf = new Intl.NumberFormat("sk-SK", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("sk-SK", { maximumFractionDigits: 1 });
const today = () => iso(new Date());

// ---------------------------------------------------------------- grafy (SVG)
function Bars({ data, color = "var(--green)", height = 210, hlColor = "var(--amber)" }) {
  const W = 720, H = height, padL = 46, padB = 26, padT = 8;
  const max = Math.max(...data.map((d) => d.y), 1);
  const bw = (W - padL - 8) / data.length;
  const ticks = 4;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img">
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = (max / ticks) * i, y = H - padB - ((H - padB - padT) * v) / max;
        return (
          <g key={i}>
            <line x1={padL} x2={W - 4} y1={y} y2={y} stroke="#21262d" />
            <text x={padL - 6} y={y + 4} fill="var(--muted)" fontSize="10" textAnchor="end">{nf.format(v)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const h = ((H - padB - padT) * d.y) / max;
        return (
          <g key={i}>
            <rect x={padL + i * bw + 1} y={H - padB - h} width={Math.max(bw - 2, 1)} height={h}
              fill={d.hl ? hlColor : color} opacity={d.dim ? 0.35 : 0.9} rx="2" />
            {data.length <= 32 && (
              <text x={padL + i * bw + bw / 2} y={H - padB + 14} fill="var(--muted)" fontSize="9.5"
                textAnchor="middle" transform={data.length > 16 ? `rotate(40 ${padL + i * bw + bw / 2} ${H - padB + 14})` : ""}>
                {d.x}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Lines({ series, xLabels, height = 220 }) {
  const W = 720, H = height, padL = 50, padB = 24, padT = 8;
  const all = series.flatMap((s) => s.points.filter((p) => p != null && !isNaN(p)));
  const max = Math.max(...all, 1), min = Math.min(...all, 0);
  const n = Math.max(...series.map((s) => s.points.length));
  const X = (i) => padL + ((W - padL - 10) * i) / Math.max(n - 1, 1);
  const Y = (v) => H - padB - ((H - padB - padT) * (v - min)) / (max - min || 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img">
      {Array.from({ length: 5 }, (_, i) => {
        const v = min + ((max - min) / 4) * i;
        return (
          <g key={i}>
            <line x1={padL} x2={W - 4} y1={Y(v)} y2={Y(v)} stroke="#21262d" />
            <text x={padL - 6} y={Y(v) + 4} fill="var(--muted)" fontSize="10" textAnchor="end">{nf.format(v)}</text>
          </g>
        );
      })}
      {xLabels && xLabels.map((l, i) => (i % Math.ceil(n / 10) === 0 ?
        <text key={i} x={X(i)} y={H - padB + 14} fill="var(--muted)" fontSize="9.5" textAnchor="middle">{l}</text> : null))}
      {series.map((s, si) => {
        const pts = s.points.map((v, i) => (v == null || isNaN(v) ? null : `${X(i)},${Y(v)}`));
        if (s.dots) {
          return s.points.map((v, i) => (v == null || isNaN(v) ? null :
            <circle key={si + "-" + i} cx={X(i)} cy={Y(v)} r="4.5" fill={s.color} />));
        }
        const path = pts.reduce((acc, p, i) => (p ? acc + (acc && pts[i - 1] ? " L" : " M") + p : acc), "");
        return <path key={si} d={path} fill="none" stroke={s.color} strokeWidth="2" />;
      })}
    </svg>
  );
}

const Card = ({ lbl, val, sub, cls = "" }) => (
  <div className="card"><div className="lbl">{lbl}</div><div className={`val ${cls}`}>{val}</div>{sub && <div className="sub">{sub}</div>}</div>
);

// ------------------------------------------------------------------- stránka
export default function Page() {
  const [tab, setTab] = useState("pred");
  const [src, setSrc] = useState("vzniky");
  const [toast, setToast] = useState(null);
  const [staticData, setStaticData] = useState(null); // {vzniky, triedenie, matica, zvozProfil}
  const [zaznamy, setZaznamy] = useState([]);
  const [vynimky, setVynimky] = useState([]);
  const [udalosti, setUdalosti] = useState([]);
  const [priebeh, setPriebeh] = useState([]);
  const [ghOk, setGhOk] = useState(null);

  useEffect(() => {
    (async () => {
      const [vz, tr, mt] = await Promise.all([
        fetch("/data/vzniky_hodinove.csv").then((r) => r.text()),
        fetch("/data/baseline_hodinove.csv").then((r) => r.text()),
        fetch("/data/zvoz_matica.json").then((r) => r.json()),
      ]);
      setStaticData({ vzniky: parseCSV(vz), triedenie: parseCSV(tr), matica: mt.matica, zvozProfil: mt.zvozProfil });
      const loadMut = async (file, setter) => {
        try {
          const r = await fetch(`/api/gh?file=${file}`, { cache: "no-store" });
          if (r.ok) { setter(parseCSV((await r.json()).content)); setGhOk(true); return; }
          if (r.status === 501) setGhOk(false);
        } catch {}
        const fb = await fetch(`/data/${file}`).then((r) => r.text()).catch(() => "");
        setter(parseCSV(fb));
      };
      loadMut("zaznamy.csv", setZaznamy);
      loadMut("vynimky.csv", setVynimky);
      loadMut("udalosti.csv", setUdalosti);
      loadMut("priebeh.csv", setPriebeh);
    })();
  }, []);

  const show = (msg, err = false) => { setToast({ msg, err }); setTimeout(() => setToast(null), 3800); };

  const save = async (file, rows, columns, message, setter) => {
    setter(rows);
    try {
      const r = await fetch("/api/gh", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file, content: toCSV(rows, columns), message }),
      });
      if (r.ok) show(`Uložené a commitnuté: ${file}`);
      else show((await r.json()).error || "Uložené len lokálne.", true);
    } catch { show("Uložené len lokálne (bez pripojenia).", true); }
  };

  // ---- odvodené dáta pre zvolený zdroj
  const D = useMemo(() => {
    if (!staticData) return null;
    const zazSrc = zaznamy.filter((z) => (z.zdroj || "triedenie") === src);
    const hourly = mergedHourly(staticData[src], zazSrc);
    const daily = buildDaily(staticData[src], zazSrc.filter((z) => z.hodina === "" || z.hodina == null || z.hodina === undefined));
    const dailyAll = buildDaily(staticData[src], zazSrc);
    const vynD = vynimky.map((v) => v.datum);
    const model = fitModel(dailyAll, vynD, udalosti);
    const prof = hourlyProfile(hourly, vynD);
    return { hourly, daily: dailyAll, vynD, model, prof };
  }, [staticData, zaznamy, vynimky, udalosti, src]);

  // ---- vzniky vždy (pre zvoz), nezávisle od prepínača
  const V = useMemo(() => {
    if (!staticData) return null;
    const zazSrc = zaznamy.filter((z) => (z.zdroj || "triedenie") === "vzniky");
    const daily = buildDaily(staticData.vzniky, zazSrc);
    const vynD = vynimky.map((v) => v.datum);
    return { daily, model: fitModel(daily, vynD, udalosti), prof: hourlyProfile(mergedHourly(staticData.vzniky, zazSrc), vynD) };
  }, [staticData, zaznamy, vynimky, udalosti]);

  if (!D || !V) return <div className="shell"><div className="note">Načítavam dáta…</div></div>;
  const { model, prof } = D;
  const uda = udalosti;

  const trendPct = model.slope >= 0 ? "up" : "down";
  return (
    <div className="shell">
      <div className="masthead">
        <h1>JBL PREDIKCIA <span className="tag">SKLC3 · AutoStore</span></h1>
        <div className="statusline">
          <span>zdroj <b>{src === "vzniky" ? "vzniky (objednávky)" : "triedenie (expedícia)"}</b></span>
          <span>tréning <b>{model.trainDays} dní</b></span>
          <span>posledné dáta <b>{fmtD(model.lastDate)}{model.lastDate.slice(0, 4)}</b></span>
          <span>úroveň <b>{nf.format(model.levelNow)}</b> JBL/deň</span>
          <span className={trendPct}>trend {model.slope >= 0 ? "▲" : "▼"} {nf.format(Math.abs(model.slope))}/deň</span>
          {Math.abs((model.corr ?? 1) - 1) >= 0.02 && <span className="warn">korekcia ×{model.corr.toFixed(2)}</span>}
        </div>
        <div className="srcswitch" role="tablist" aria-label="Zdroj dát">
          <button className={src === "vzniky" ? "on" : ""} onClick={() => setSrc("vzniky")}>🛒 Vzniky</button>
          <button className={src === "triedenie" ? "on" : ""} onClick={() => setSrc("triedenie")}>📦 Triedenie</button>
        </div>
        {ghOk === false && <div className="note" style={{ marginTop: 8 }}>⚠️ GitHub zápis nie je nakonfigurovaný (env GH_TOKEN / GH_REPO) – zmeny platia len do obnovenia stránky.</div>}
      </div>

      <div className="tabs">
        {[["pred", "🔮 Predikcia"], ["zvoz", "🚚 Zvozy"], ["prepocet", "🔄 Prepočet predikcie"],
          ["vstup", "➕ Zadávanie dát"], ["anom", "⚠️ Anomálie"], ["udal", "📅 Udalosti"], ["model", "🧠 Model"]]
          .map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {tab === "pred" && <TabPredikcia D={D} uda={uda} />}
      {tab === "zvoz" && <TabZvoz V={V} staticData={staticData} uda={uda} />}
      {tab === "prepocet" && <TabPrepocet D={D} uda={uda} src={src} priebeh={priebeh} save={save} setPriebeh={setPriebeh} />}
      {tab === "vstup" && <TabVstup src={src} zaznamy={zaznamy} setZaznamy={setZaznamy} vynimky={vynimky} setVynimky={setVynimky} save={save} />}
      {tab === "anom" && <TabAnomalie D={D} uda={uda} vynimky={vynimky} setVynimky={setVynimky} save={save} />}
      {tab === "udal" && <TabUdalosti D={D} uda={uda} setUdalosti={setUdalosti} save={save} />}
      {tab === "model" && <TabModel D={D} />}

      {toast && <div className={`toast ${toast.err ? "err" : ""}`}>{toast.msg}</div>}
    </div>
  );
}

// ------------------------------------------------------------- 🔮 Predikcia
function TabPredikcia({ D, uda }) {
  const [datum, setDatum] = useState(today());
  const [horizon, setHorizon] = useState(14);
  const { model, prof, daily } = D;
  const pred = predictDay(datum, model, uda);
  const s = model.residStd;
  const ev = eventMult(datum, uda);
  const p = prof[String(dow(datum) >= 5)];
  const hist = daily.slice(-60);
  return (
    <>
      <div className="frm" style={{ marginBottom: 12 }}>
        <div className="fld"><label>Dátum predikcie</label><input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} /></div>
        <div className="fld"><label>Horizont: {horizon} dní</label><input type="range" min="7" max="28" value={horizon} onChange={(e) => setHorizon(+e.target.value)} /></div>
      </div>
      <div className="grid g4">
        <Card lbl={`Predikcia na ${fmtD(datum)} (${DNI[dow(datum)]})`} val={`${nf.format(pred)}`} cls="accent"
          sub={`80 % interval: ${nf.format(pred * (1 - 1.28 * s))} – ${nf.format(pred * (1 + 1.28 * s))}`} />
        <Card lbl="Faktor dňa v týždni" val={model.dowF[dow(datum)].toFixed(2)} sub={`deň v mesiaci: ${model.domF[new Date(datum).getUTCDate()].toFixed(2)}`} />
        <Card lbl="Udalosti" val={`×${ev.toFixed(2)}`} cls={ev === 1 ? "" : "warn"} sub={ev === 1 ? "žiadna aktívna udalosť" : "aktívna udalosť upravuje predikciu"} />
        <Card lbl="Denná úroveň modelu" val={nf.format(model.levelNow)} sub={`trend ${model.slope >= 0 ? "+" : ""}${nf.format(model.slope)}/deň, tlmený`} />
      </div>

      <div className="section">
        <h3>Hodinová predikcia · {fmtD(datum)}</h3>
        <div className="chartbox"><Bars data={p.map((v, h) => ({ x: String(h).padStart(2, "0"), y: pred * v }))} /></div>
      </div>

      <div className="section">
        <h3>Denná predikcia · najbližších {horizon} dní</h3>
        <div className="chartbox">
          <Bars data={Array.from({ length: horizon }, (_, i) => {
            const d = addDays(today(), i);
            return { x: fmtD(d), y: predictDay(d, model, uda), hl: eventMult(d, uda) !== 1 };
          })} />
          <div className="legend"><span><i style={{ background: "var(--green)" }} />bežný deň</span><span><i style={{ background: "var(--amber)" }} />deň s udalosťou</span></div>
        </div>
      </div>

      <div className="section">
        <h3>Skutočnosť vs. model · posledných 60 dní</h3>
        <div className="chartbox">
          <div className="legend"><span><i style={{ background: "var(--green)" }} />skutočnosť</span><span><i style={{ background: "var(--muted)" }} />model</span></div>
          <Lines xLabels={hist.map((r) => fmtD(r.datum))} series={[
            { color: "var(--green)", points: hist.map((r) => r.jbl) },
            { color: "var(--muted)", points: hist.map((r) => expectedFor(r.datum, model, uda)) },
          ]} />
        </div>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ 🚚 Zvozy
function TabZvoz({ V, staticData, uda }) {
  const [datum, setDatum] = useState(today());
  const actual = useMemo(() => new Map(V.daily.map((r) => [r.datum, r.jbl])), [V.daily]);
  const vznikyOf = (d) => actual.get(d) ?? predictDay(d, V.model, uda);
  const z = predictZvoz(datum, staticData.matica, V.prof, vznikyOf);
  const days = [0, 1, 2, 3].map((k) => addDays(datum, -k));
  return (
    <>
      <p className="note">
        Predikcia expedičnej záťaže (zvozov) z vznikov. Každá hodina vzniku má z historických dát (OLAP, 10/2025–07/2026)
        vlastný podiel „koľko z toho reálne odíde“ a rozdelenie na deň D / D+1 / D+2+. Vzniky za minulé dni sa berú
        zo skutočnosti, budúce z modelu vznikov.
      </p>
      <div className="frm" style={{ marginBottom: 12 }}>
        <div className="fld"><label>Deň zvozu</label><input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} /></div>
      </div>
      <div className="grid g4">
        <Card lbl={`Predikcia zvozov · ${fmtD(datum)} (${DNI[dow(datum)]})`} val={nf.format(z.total)} cls="blue" sub="jobline na expedíciu" />
        {[0, 1, 2].map((k) => (
          <Card key={k} lbl={`Z vznikov ${k === 0 ? "v deň zvozu" : fmtD(days[k])} (D${-k})`}
            val={nf.format(z.contrib[k])}
            sub={`${nf1.format((z.contrib[k] / z.total) * 100)} % objemu · vzniky: ${nf.format(vznikyOf(days[k]))}${actual.has(days[k]) ? " (skutočnosť)" : " (model)"}`} />
        ))}
      </div>

      <div className="section">
        <h3>Hodinový profil zvozov · {fmtD(datum)}</h3>
        <div className="chartbox">
          <Bars color="var(--blue)" data={staticData.zvozProfil.map((v, h) => ({ x: String(h).padStart(2, "0"), y: z.total * v }))} />
        </div>
        <p className="note">Zvozy odchádzajú prevažne v noci (špička 2:00–5:00) – profil z posledných 60 dní zvozov.</p>
      </div>

      <div className="section">
        <h3>Zvozy · najbližších 7 dní</h3>
        <div className="chartbox">
          <Bars color="var(--blue)" data={Array.from({ length: 7 }, (_, i) => {
            const d = addDays(today(), i);
            return { x: `${fmtD(d)} ${DNI[dow(d)]}`, y: predictZvoz(d, staticData.matica, V.prof, vznikyOf).total };
          })} />
        </div>
        <p className="note">Približne 88 % vzniknutých jobline reálne prejde zvozom (zvyšok sú interné/systémové joby bez expedície) –
          z toho ~26 % odíde v deň vzniku a ~65 % na druhý deň.</p>
      </div>
    </>
  );
}

// -------------------------------------------------- 🔄 Prepočet predikcie
function TabPrepocet({ D, uda, src, priebeh, save, setPriebeh }) {
  const [datum, setDatum] = useState(today());
  const [H, setH] = useState(12);
  const [vznik, setVznik] = useState(0);
  const [pick, setPick] = useState(0);
  const [mode, setMode] = useState("dow");
  const [refDay, setRefDay] = useState(addDays(today(), -1));
  const { hourly, daily, vynD, model, prof } = D;

  const r = intraday(hourly, daily, vynD, datum, H, vznik, mode, refDay);
  const modelPred = predictDay(datum, model, uda);
  const cp = cumProfile(hourly, r.comp);
  const diff = r.eod && modelPred > 0 ? r.eod / modelPred - 1 : 0;

  const saveSnap = () => {
    const rows = [...priebeh, { datum, hodina: H, vznik, pick, odhad_eod: r.eod ? Math.round(r.eod) : "", zdroj: src }];
    save("priebeh.csv", rows, ["datum", "hodina", "vznik", "pick", "odhad_eod", "zdroj"], `data: snímka ${datum} ${H}:00`, setPriebeh);
  };
  const snaps = priebeh.filter((p) => p.datum === datum && (p.zdroj || "triedenie") === src);

  return (
    <>
      <p className="note">Odhad konca dňa = dnešný stav ÷ podiel, ktorý porovnávacie dni dosiahli do tej istej hodiny.</p>
      <div className="frm" style={{ marginBottom: 10 }}>
        <div className="fld"><label>Dátum</label><input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} /></div>
        <div className="fld"><label>Stav do hodiny</label>
          <select value={H} onChange={(e) => setH(+e.target.value)}>
            {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
          </select></div>
        <div className="fld"><label>Vzniknuté JBL do hodiny</label><input type="number" min="0" step="100" value={vznik || ""} onChange={(e) => setVznik(+e.target.value || 0)} /></div>
        <div className="fld"><label>Vypikované JBL (voliteľné)</label><input type="number" min="0" step="100" value={pick || ""} onChange={(e) => setPick(+e.target.value || 0)} /></div>
      </div>
      <div className="frm" style={{ marginBottom: 14 }}>
        <div className="seg">
          {[["dow", "Rovnaký deň v týždni (4×)"], ["last14", "Posledných 14 dní"], ["ref", "Konkrétny deň"]].map(([k, l]) =>
            <button key={k} className={mode === k ? "on" : ""} onClick={() => setMode(k)}>{l}</button>)}
        </div>
        {mode === "ref" && <div className="fld"><label>Porovnávací deň</label><input type="date" value={refDay} onChange={(e) => setRefDay(e.target.value)} /></div>}
      </div>

      {r.eod ? (
        <>
          <div className="grid g4">
            <Card lbl={`Vzniknuté do ${String(H).padStart(2, "0")}:00`} val={nf.format(vznik)} sub={`porovnávacie dni do tejto hodiny: ${(r.shareMed * 100).toFixed(0)} % dňa`} />
            <Card lbl="Odhad konca dňa (extrapolácia)" val={nf.format(r.eod)} cls="accent" sub={`rozpätie ${nf.format(r.eodLo)} – ${nf.format(r.eodHi)}`} />
            <Card lbl="Ešte pribudne" val={nf.format(Math.max(r.eod - vznik, 0))} cls="warn" sub={`modelová predikcia dňa: ${nf.format(modelPred)}`} />
            <Card lbl="Pick stav" val={pick ? nf.format(pick) : "–"}
              sub={pick ? `backlog teraz: ${nf.format(Math.max(vznik - pick, 0))} · do konca dňa vypikovať: ${nf.format(Math.max(r.eod - pick, 0))}` : "nezadané"} />
          </div>
          {Math.abs(diff) >= 0.15 && (
            <p className="note" style={{ color: "var(--amber)" }}>
              ⚠️ Extrapolácia sa od modelovej predikcie líši o {(diff * 100).toFixed(0)} % – skontroluj dáta, alebo deň ovplyvňuje niečo, čo model nepozná (akcia / výpadok).
            </p>
          )}
          <div className="section">
            <h3>Projekcia kumulatívnej krivky dňa</h3>
            <div className="chartbox">
              <div className="legend"><span><i style={{ background: "var(--muted)" }} />projekcia z porovnávacích dní</span><span><i style={{ background: "var(--green)" }} />dnešný zadaný stav</span></div>
              <Lines xLabels={Array.from({ length: 24 }, (_, h) => String(h + 1).padStart(2, "0"))} series={[
                { color: "var(--muted)", points: cp.map((v) => v * r.eod) },
                { color: "var(--green)", dots: true, points: Array.from({ length: 24 }, (_, i) => (i + 1 === H ? vznik : null)) },
              ]} />
            </div>
          </div>
        </>
      ) : <p className="note">Zadaj vzniknuté JBL – odhad sa prepočíta okamžite.</p>}

      <div className="section">
        <h3>Porovnávacie dni (kontrola dát)</h3>
        <table className="t"><thead><tr><th>Deň</th><th>Vznik do {String(H).padStart(2, "0")}:00</th><th>Deň spolu</th><th>Podiel</th></tr></thead>
          <tbody>{r.comp.map((c) => (
            <tr key={c.datum}><td>{fmtD(c.datum)} {DNI[dow(c.datum)]}</td><td>{nf.format(c.cum)}</td><td>{nf.format(c.tot)}</td><td>{(c.share * 100).toFixed(1)} %</td></tr>
          ))}</tbody></table>
      </div>

      <div className="section">
        <h3>Snímky priebehu</h3>
        <button className="btn" disabled={!r.eod} onClick={saveSnap}>💾 Uložiť snímku</button>
        {snaps.length > 0 && (
          <table className="t" style={{ marginTop: 10 }}><thead><tr><th>Hodina</th><th>Vznik</th><th>Pick</th><th>Odhad EOD</th></tr></thead>
            <tbody>{snaps.map((s, i) => (
              <tr key={i}><td>{String(s.hodina).padStart(2, "0")}:00</td><td>{nf.format(+s.vznik)}</td><td>{s.pick ? nf.format(+s.pick) : "–"}</td><td>{s.odhad_eod ? nf.format(+s.odhad_eod) : "–"}</td></tr>
            ))}</tbody></table>
        )}
      </div>
    </>
  );
}

// ------------------------------------------------------- ➕ Zadávanie dát
function TabVstup({ src, zaznamy, setZaznamy, vynimky, setVynimky, save }) {
  const [datum, setDatum] = useState(addDays(today(), -1));
  const [total, setTotal] = useState(0);
  const [anom, setAnom] = useState("Žiadna");
  const zazSrc = zaznamy.filter((z) => (z.zdroj || "triedenie") === src);
  const COLS = ["datum", "hodina", "joblines", "poznamka", "zdroj"];

  const uloz = () => {
    const rest = zaznamy.filter((z) => !(z.datum === datum && (z.zdroj || "triedenie") === src));
    const rows = [...rest, { datum, hodina: "", joblines: total, poznamka: anom !== "Žiadna" ? anom : "", zdroj: src }];
    save("zaznamy.csv", rows, COLS, `data: záznam JBL ${datum} (${src})`, setZaznamy);
    if (anom !== "Žiadna") {
      const vrest = vynimky.filter((v) => v.datum !== datum);
      save("vynimky.csv", [...vrest, { datum, typ: anom, popis: "zadané pri vklade dát" }],
        ["datum", "typ", "popis"], `data: výnimka ${datum} – ${anom}`, setVynimky);
    }
  };
  const zmaz = (d) => {
    const rows = zaznamy.filter((z) => !(z.datum === d && (z.zdroj || "triedenie") === src));
    save("zaznamy.csv", rows, COLS, `data: vymazaný záznam ${d} (${src})`, setZaznamy);
  };

  return (
    <>
      <p className="note">Spätné zadanie skutočných jobline pre zdroj <b>{src}</b>. Záznam prepíše baseline pre daný deň.
        Ak deň sprevádzala anomália, označ ju – deň sa vylúči z tréningu modelu.</p>
      <div className="frm">
        <div className="fld"><label>Dátum</label><input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} /></div>
        <div className="fld"><label>Joblines spolu (deň)</label><input type="number" min="0" step="100" value={total || ""} onChange={(e) => setTotal(+e.target.value || 0)} /></div>
        <div className="fld"><label>Anomália (voliteľné)</label>
          <select value={anom} onChange={(e) => setAnom(e.target.value)}>
            <option>Žiadna</option>{TYPY_VYNIMIEK.map((t) => <option key={t}>{t}</option>)}
          </select></div>
        <button className="btn" disabled={!total} onClick={uloz}>💾 Uložiť záznam</button>
      </div>

      <div className="section">
        <h3>Zadané záznamy · {src} ({new Set(zazSrc.map((z) => z.datum)).size} dní)</h3>
        {zazSrc.length ? (
          <table className="t"><thead><tr><th>Dátum</th><th>Joblines</th><th>Anomália</th><th /></tr></thead>
            <tbody>{[...zazSrc].sort((a, b) => (a.datum < b.datum ? 1 : -1)).map((z, i) => (
              <tr key={i}><td>{fmtD(z.datum)}{z.datum.slice(0, 4)}</td><td>{nf.format(+z.joblines)}</td>
                <td>{z.poznamka ? <span className="pill amber">{z.poznamka}</span> : "–"}</td>
                <td><button className="btn ghost" onClick={() => zmaz(z.datum)}>🗑️</button></td></tr>
            ))}</tbody></table>
        ) : <p className="note">Zatiaľ žiadne používateľské záznamy – model beží na baseline dátach.</p>}
      </div>
    </>
  );
}

// -------------------------------------------------------- ⚠️ Anomálie
function TabAnomalie({ D, uda, vynimky, setVynimky, save }) {
  const [thr, setThr] = useState(25);
  const [datum, setDatum] = useState(addDays(today(), -1));
  const [typ, setTyp] = useState(TYPY_VYNIMIEK[0]);
  const [popis, setPopis] = useState("");
  const { daily, model } = D;
  const vmap = new Map(vynimky.map((v) => [v.datum, v]));
  const anom = daily
    .map((r) => ({ ...r, ocak: expectedFor(r.datum, model, uda) }))
    .map((r) => ({ ...r, dev: r.jbl / r.ocak - 1 }))
    .filter((r) => Math.abs(r.dev) >= thr / 100)
    .sort((a, b) => (a.datum < b.datum ? 1 : -1));
  const bez = anom.filter((r) => !vmap.has(r.datum)).length;

  const uloz = () => {
    const rest = vynimky.filter((v) => v.datum !== datum);
    save("vynimky.csv", [...rest, { datum, typ, popis }], ["datum", "typ", "popis"], `data: výnimka ${datum} – ${typ}`, setVynimky);
  };
  const zmaz = (d) => save("vynimky.csv", vynimky.filter((v) => v.datum !== d), ["datum", "typ", "popis"], `data: odstránená výnimka ${d}`, setVynimky);

  return (
    <>
      <div className="frm" style={{ marginBottom: 10 }}>
        <div className="fld"><label>Prah odchýlky: ±{thr} %</label><input type="range" min="10" max="50" value={thr} onChange={(e) => setThr(+e.target.value)} /></div>
      </div>
      <p className="note">Nájdených <b>{anom.length}</b> dní mimo ±{thr} % od modelu, z toho <span className="bad">{bez} bez priradenej výnimky</span>.
        Deň s výnimkou sa vylúči z tréningu – anomália tak neskreslí predikciu.</p>
      <table className="t"><thead><tr><th>Dátum</th><th>Skutočnosť</th><th>Očakávané</th><th>Odchýlka</th><th>Výnimka</th></tr></thead>
        <tbody>{anom.slice(0, 40).map((r) => (
          <tr key={r.datum}>
            <td>{fmtD(r.datum)}{r.datum.slice(0, 4)} {DNI[dow(r.datum)]}</td>
            <td>{nf.format(r.jbl)}</td><td>{nf.format(r.ocak)}</td>
            <td className={r.dev < 0 ? "bad" : "accent"}>{(r.dev * 100).toFixed(1)} %</td>
            <td>{vmap.has(r.datum) ? <span className="pill gray">{vmap.get(r.datum).typ}</span> : <span className="pill red">nepriradená</span>}</td>
          </tr>
        ))}</tbody></table>

      <div className="section">
        <h3>Priradiť výnimku</h3>
        <div className="frm">
          <div className="fld"><label>Dátum</label><input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} /></div>
          <div className="fld"><label>Typ výnimky</label>
            <select value={typ} onChange={(e) => setTyp(e.target.value)}>{TYPY_VYNIMIEK.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div className="fld"><label>Popis (voliteľné)</label><input value={popis} onChange={(e) => setPopis(e.target.value)} /></div>
          <button className="btn" onClick={uloz}>⚠️ Uložiť výnimku</button>
        </div>
      </div>

      {vynimky.length > 0 && (
        <div className="section">
          <h3>Evidované výnimky ({vynimky.length})</h3>
          <table className="t"><thead><tr><th>Dátum</th><th>Typ</th><th>Popis</th><th /></tr></thead>
            <tbody>{[...vynimky].sort((a, b) => (a.datum < b.datum ? 1 : -1)).map((v) => (
              <tr key={v.datum}><td>{fmtD(v.datum)}{v.datum.slice(0, 4)}</td><td>{v.typ}</td><td style={{ fontFamily: "var(--sans)" }}>{v.popis}</td>
                <td><button className="btn ghost" onClick={() => zmaz(v.datum)}>🗑️</button></td></tr>
            ))}</tbody></table>
        </div>
      )}
    </>
  );
}

// -------------------------------------------------------- 📅 Udalosti
function TabUdalosti({ D, uda, setUdalosti, save }) {
  const dk = D.model.defaultKoef;
  const [nazov, setNazov] = useState("");
  const [typ, setTyp] = useState("Alza dni");
  const [od, setOd] = useState(today());
  const [doD, setDoD] = useState(addDays(today(), 1));
  const [koef, setKoef] = useState(dk["Alza dni"]);
  const [eOd, setEOd] = useState(addDays(today(), -14));
  const [eDo, setEDo] = useState(addDays(today(), -10));
  const [odhad, setOdhad] = useState(null);
  const COLS = ["nazov", "od", "do", "typ", "koeficient"];

  const changeTyp = (t) => { setTyp(t); setKoef(dk[t] ?? 1.1); };
  const uloz = () => {
    if (!nazov.trim() || doD < od) return;
    save("udalosti.csv", [...uda, { nazov: nazov.trim(), od, do: doD, typ, koeficient: koef }], COLS, `data: udalosť ${nazov.trim()}`, setUdalosti);
    setNazov("");
  };
  const zmaz = (n) => save("udalosti.csv", uda.filter((u) => u.nazov !== n), COLS, `data: vymazaná udalosť ${n}`, setUdalosti);
  const spocitaj = () => {
    const rng = D.daily.filter((r) => r.datum >= eOd && r.datum <= eDo);
    if (!rng.length) { setOdhad("V zadanom rozsahu nie sú žiadne dáta."); return; }
    const ratios = rng.map((r) => r.jbl / (expectedFor(r.datum, D.model, uda) / eventMult(r.datum, uda)));
    ratios.sort((a, b) => a - b);
    const k = ratios[ratios.length >> 1];
    setOdhad(`Navrhovaný koeficient: ${k.toFixed(2)} (medián pomeru skutočnosť/model za ${rng.length} dní)`);
  };

  return (
    <>
      <p className="note">Koeficient násobí predikciu v danom rozsahu (1.05 = +5 %). Historické udalosti sa zároveň
        odfiltrujú zo sezónnosti modelu. Koeficient sa predvyplní z historických dát podľa typu – môžeš ho upraviť.</p>
      <div className="frm">
        <div className="fld"><label>Názov</label><input placeholder="napr. Alza dni august" value={nazov} onChange={(e) => setNazov(e.target.value)} style={{ minWidth: 200 }} /></div>
        <div className="fld"><label>Typ</label><select value={typ} onChange={(e) => changeTyp(e.target.value)}>{TYPY_UDALOSTI.map((t) => <option key={t}>{t}</option>)}</select></div>
        <div className="fld"><label>Od</label><input type="date" value={od} onChange={(e) => setOd(e.target.value)} /></div>
        <div className="fld"><label>Do</label><input type="date" value={doD} onChange={(e) => setDoD(e.target.value)} /></div>
        <div className="fld"><label>Koeficient</label><input type="number" step="0.01" min="0.3" max="2.5" value={koef} onChange={(e) => setKoef(+e.target.value)} /></div>
        <button className="btn" disabled={!nazov.trim()} onClick={uloz}>📅 Uložiť udalosť</button>
      </div>
      {typ === "Black Friday" && <p className="note">Koeficient 1.36 vypočítaný z vznikov počas BF víkendu 2025 (27.11.–1.12.) oproti okolitým týždňom.</p>}

      {uda.length > 0 && (
        <div className="section">
          <table className="t"><thead><tr><th>Názov</th><th>Od</th><th>Do</th><th>Typ</th><th>Koef.</th><th /></tr></thead>
            <tbody>{[...uda].sort((a, b) => (a.od < b.od ? 1 : -1)).map((u) => (
              <tr key={u.nazov}><td style={{ fontFamily: "var(--sans)" }}>{u.nazov}</td><td>{fmtD(u.od)}{u.od.slice(0, 4)}</td><td>{fmtD(u.do)}{u.do.slice(0, 4)}</td>
                <td><span className="pill green">{u.typ}</span></td><td>×{(+u.koeficient).toFixed(2)}</td>
                <td><button className="btn ghost" onClick={() => zmaz(u.nazov)}>🗑️</button></td></tr>
            ))}</tbody></table>
        </div>
      )}

      <div className="section">
        <h3>Predpočítané koeficienty z histórie</h3>
        <table className="t"><thead><tr><th>Typ udalosti</th><th>Default</th></tr></thead>
          <tbody>{Object.entries(dk).map(([t, k]) => <tr key={t}><td style={{ fontFamily: "var(--sans)" }}>{t}</td><td>×{(+k).toFixed(2)}</td></tr>)}</tbody></table>
        <p className="note">Alza dni / Mega zľavy / AlzaPlus+: log-lineárna regresia na reálnom promo kalendári feb–jún 2026.
          Black Friday: BF víkend 2025 z vznikov. Výplatný termín: priemer faktora dní 10.–16. Sviatok: medián prepadu anomálnych dní.</p>
      </div>

      <div className="section">
        <h3>Odhad koeficientu z histórie</h3>
        <div className="frm">
          <div className="fld"><label>Od</label><input type="date" value={eOd} onChange={(e) => setEOd(e.target.value)} /></div>
          <div className="fld"><label>Do</label><input type="date" value={eDo} onChange={(e) => setEDo(e.target.value)} /></div>
          <button className="btn" onClick={spocitaj}>🔍 Vypočítať koeficient</button>
        </div>
        {odhad && <p className="note" style={{ color: "var(--text)" }}>{odhad}</p>}
      </div>
    </>
  );
}

// ------------------------------------------------------------ 🧠 Model
function TabModel({ D }) {
  const { model, prof } = D;
  return (
    <>
      <p className="note">Predikcia = <b>úroveň s trendom</b> × <b>faktor dňa v týždni</b> × <b>faktor dňa v mesiaci</b> × <b>koeficient udalostí</b>.
        Dni s výnimkou sú z tréningu vylúčené, historické udalosti odfiltrované.</p>
      <div className="grid g2">
        <div className="chartbox">
          <h3 style={{ margin: "2px 0 6px", fontSize: 14 }}>Faktor dňa v týždni (8 týždňov)</h3>
          <Bars height={190} data={model.dowF.map((v, i) => ({ x: DNI[i], y: v }))} />
        </div>
        <div className="chartbox">
          <h3 style={{ margin: "2px 0 6px", fontSize: 14 }}>Faktor dňa v mesiaci (výplatné výkyvy)</h3>
          <Lines height={190} xLabels={Array.from({ length: 31 }, (_, i) => String(i + 1))} series={[
            { color: "var(--green)", points: Array.from({ length: 31 }, (_, i) => model.domF[i + 1]) },
          ]} />
        </div>
      </div>
      <div className="section chartbox">
        <h3 style={{ margin: "2px 0 6px", fontSize: 14 }}>Hodinový profil (podiel dňa, 6 týždňov)</h3>
        <div className="legend"><span><i style={{ background: "var(--green)" }} />pracovný deň</span><span><i style={{ background: "var(--muted)" }} />víkend</span></div>
        <Lines height={200} xLabels={Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"))} series={[
          { color: "var(--green)", points: prof["false"].map((v) => v * 100) },
          { color: "var(--muted)", points: prof["true"].map((v) => v * 100) },
        ]} />
      </div>
      <p className="note">
        Denná úroveň (deseasonalizovaná): <b>{nf.format(model.levelNow)} JBL</b> ·
        trend <b>{model.slope >= 0 ? "+" : ""}{nf.format(model.slope)}/deň</b> (tlmený, ~50 % po 30 dňoch) ·
        krátkodobá korekcia <b>×{(model.corr ?? 1).toFixed(2)}</b> (medián posledných 5 dní vs. model, do budúcnosti sa vytráca) ·
        variabilita rezíduí <b>±{(model.residStd * 100).toFixed(0)} %</b> (základ 80 % intervalu) ·
        tréningové dni <b>{model.trainDays}</b>
      </p>
    </>
  );
}
