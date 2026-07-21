"use client";
import { useEffect, useMemo, useState } from "react";
import { parseCSV, toCSV } from "../lib/csv";
import {
  TYPY_VYNIMIEK, TYPY_UDALOSTI, buildDaily, mergedHourly, fitModel, predictDay,
  expectedFor, hourlyProfile, eventMult, intraday, cumProfile, predictZvoz,
  addDays, dow, DNI, fmtD, iso, opShift, OP_HOURS, OP_START, dropIncompleteLastOpDay, backtest, parseVynimky, adjustPartialDays, backlogForDay,
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
  const [kpi, setKpi] = useState([]);
  const [backlogy, setBacklogy] = useState([]);
  const [ghOk, setGhOk] = useState(null);
  const [loadErr, setLoadErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
      const need = async (url, kind) => {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`Chýba súbor ${url} (HTTP ${r.status})`);
        return kind === "json" ? r.json() : r.text();
      };
      const [vz, tr, pr, ds, mt] = await Promise.all([
        need("/data/vzniky_hodinove.csv"),
        need("/data/baseline_hodinove.csv"),
        fetch("/data/prijem_hodinove.csv").then((r) => (r.ok ? r.text() : "")).catch(() => ""),
        fetch("/data/distribucia_hodinove.csv").then((r) => (r.ok ? r.text() : "")).catch(() => ""),
        need("/data/zvoz_matica.json", "json"),
      ]);
      const [kvD, kvH, pom] = await Promise.all([
        fetch("/data/kvalita_denne.csv").then((r) => r.text()).catch(() => ""),
        fetch("/data/kvalita_hodiny.json").then((r) => r.json()).catch(() => null),
        fetch("/data/procesy_pomery.json").then((r) => r.json()).catch(() => null),
      ]);
      setStaticData({
        vzniky: dropIncompleteLastOpDay(opShift(parseCSV(vz))),
        triedenie: dropIncompleteLastOpDay(opShift(parseCSV(tr))),
        prijem: dropIncompleteLastOpDay(opShift(parseCSV(pr))),
        distribucia: dropIncompleteLastOpDay(opShift(parseCSV(ds))),
        matica: mt.matica, zvozProfil: mt.zvozProfil,
        slotMap: mt.slotMap || {}, harmonogram: mt.harmonogram || {}, planStat: mt.plan || null,
        kvalitaDenne: parseCSV(kvD), kvalitaHodiny: kvH,
        pomery: pom ? pom.pomery_vs_sorted : { Sort: 1, Pick: 1, Pack: 1 },
      });
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
      loadMut("kpi.csv", setKpi);
      loadMut("backlog.csv", setBacklogy);
      } catch (e) { setLoadErr(String(e.message || e)); }
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
    const dailyAll = buildDaily(staticData[src], zazSrc);
    const { full, part } = parseVynimky(vynimky);
    const allVynD = [...full, ...part.map((p) => p.datum)];
    const prof = hourlyProfile(hourly, allVynD);
    // dni s hodinovou anomáliou: oprav denný objem dopočtom, netreba ich vyhadzovať
    const { daily: dailyAdj, extraExclude } = adjustPartialDays(dailyAll, hourly, part, prof);
    const btExcl = [...full, ...extraExclude];
    const model = fitModel(dailyAdj, btExcl, udalosti);
    return { hourly, daily: dailyAll, dailyAdj, vynD: allVynD, btExcl, part, model, prof };
  }, [staticData, zaznamy, vynimky, udalosti, src]);

  // ---- vzniky vždy (pre zvoz), nezávisle od prepínača
  const V = useMemo(() => {
    if (!staticData) return null;
    const zazSrc = zaznamy.filter((z) => (z.zdroj || "triedenie") === "vzniky");
    const daily = buildDaily(staticData.vzniky, zazSrc);
    const vynD = vynimky.map((v) => v.datum);
    return { daily, model: fitModel(daily, vynD, udalosti), prof: hourlyProfile(mergedHourly(staticData.vzniky, zazSrc), vynD) };
  }, [staticData, zaznamy, vynimky, udalosti]);

  const TP = useMemo(() => {
    if (!staticData) return null;
    const mk = (key) => {
      const zazS = zaznamy.filter((z) => (z.zdroj || "triedenie") === key);
      const daily = buildDaily(staticData[key], zazS);
      const vynD = vynimky.map((v) => v.datum);
      return { daily, model: fitModel(daily, vynD, udalosti), prof: hourlyProfile(mergedHourly(staticData[key], zazS), vynD) };
    };
    return { triedenie: mk("triedenie"), prijem: mk("prijem"), distribucia: mk("distribucia") };
  }, [staticData, zaznamy, vynimky, udalosti]);

  if (loadErr) return (
    <div className="shell"><div className="masthead">
      <h1>PREDIKCIA SKLC3</h1>
      <div className="note" style={{ marginTop: 8, color: "var(--red)" }}>⚠️ Dáta sa nepodarilo načítať: {loadErr}</div>
      <div className="note">Skontroluj, či je súbor v repe v `public/data/` a či prebehol Redeploy.</div>
    </div></div>
  );
  if (!D || !V || !TP) return <div className="shell"><div className="note">Načítavam dáta…</div></div>;
  const { model, prof } = D;
  const uda = udalosti;

  const trendPct = model.slope >= 0 ? "up" : "down";
  const STANDALONE = ["kvalita", "udal", "kpi", "model"];
  const naZdroji = !STANDALONE.includes(tab);
  const prepniZdroj = (key) => {
    setSrc(key);
    if (!naZdroji || (key !== "vzniky" && tab === "zvoz")) setTab("pred");
  };
  return (
    <div className="shell">
      <div className="masthead">
        <h1>PREDIKCIA SKLC3</h1>
        <div className="statusline">
          <span>deň <b>06:00–06:00</b></span>
          {naZdroji && (
            <>
              <span>zdroj <b>{{ vzniky: "vzniky (zákaznícke)", triedenie: "triedenie (expedícia)", prijem: "príjem (received)", distribucia: "distribúcia (medzisklad)" }[src]}</b></span>
              <span>tréning <b>{model.trainDays} dní</b></span>
              <span>posledné dáta <b>{fmtD(model.lastDate)}{model.lastDate.slice(0, 4)}</b></span>
              <span>úroveň <b>{nf.format(model.levelNow)}</b> JBL/deň</span>
              <span className={trendPct}>trend {model.slope >= 0 ? "▲" : "▼"} {nf.format(Math.abs(model.slope))}/deň</span>
              {Math.abs((model.corr ?? 1) - 1) >= 0.02 && <span className="warn">korekcia ×{model.corr.toFixed(2)}</span>}
            </>
          )}
        </div>
        <div className="srcswitch" role="tablist" aria-label="Sekcia">
          {[["vzniky", "🛒 Vzniky"], ["triedenie", "📦 Triedenie"], ["prijem", "📥 Príjem"], ["distribucia", "🔁 Distribúcia"]].map(([k, l]) =>
            <button key={k} className={naZdroji && src === k ? "on" : ""} onClick={() => prepniZdroj(k)}>{l}</button>)}
          <span style={{ alignSelf: "center", color: "var(--border)", padding: "0 2px", userSelect: "none" }}>│</span>
          {[["kvalita", "✅ Kvalita"], ["udal", "📅 Udalosti"], ["kpi", "🧮 KPI"], ["model", "🧠 Model"]].map(([k, l]) =>
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}
        </div>
        {naZdroji && src === "distribucia" && <div className="note" style={{ marginTop: 8 }}>🔁 Distribúcia = preposielanie medzi skladmi (vrátane nočného batchu ~3:00). Objem riadi doplňovanie, nie zákaznícky dopyt – predikciu ber orientačnejšie než pri zákazníckych vznikoch.</div>}
        {naZdroji && src === "prijem" && <div className="note" style={{ marginTop: 8 }}>📥 Príjem je riadený harmonogramom dodávok, nie zákazníckym dopytom – predikcia je orientačná (typická odchýlka ±20–40 %). Presnejší odhad by dali avíza dodávok.</div>}
        {ghOk === false && <div className="note" style={{ marginTop: 8 }}>⚠️ GitHub zápis nie je nakonfigurovaný (env GH_TOKEN / GH_REPO) – zmeny platia len do obnovenia stránky.</div>}
      </div>

      {naZdroji && (
        <div className="tabs">
          {[["pred", "🔮 Predikcia"], ...(src === "vzniky" ? [["zvoz", "🚚 Zvozy"]] : []), ["prepocet", "🔄 Prepočet predikcie"],
            ["vstup", "➕ Zadávanie dát"], ["anom", "⚠️ Anomálie"]]
            .map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}
        </div>
      )}

      {tab === "pred" && <TabPredikcia D={D} uda={uda} />}
      {tab === "zvoz" && <TabZvoz V={V} TP={TP} staticData={staticData} uda={uda} backlogy={backlogy} />}
      {tab === "prepocet" && <TabPrepocet D={D} uda={uda} src={src} priebeh={priebeh} save={save} setPriebeh={setPriebeh} />}
      {tab === "vstup" && <TabVstup src={src} zaznamy={zaznamy} setZaznamy={setZaznamy} vynimky={vynimky} setVynimky={setVynimky} save={save} />}
      {tab === "anom" && <TabAnomalie D={D} uda={uda} src={src} vynimky={vynimky} setVynimky={setVynimky} save={save} kpi={kpi} pomery={staticData.pomery} backlogy={backlogy} setBacklogy={setBacklogy} />}
      {tab === "udal" && <TabUdalosti D={V} uda={uda} setUdalosti={setUdalosti} save={save} />}
      {tab === "kvalita" && <TabKvalita staticData={staticData} />}
      {tab === "kpi" && <TabKPI TP={TP} uda={uda} pomery={staticData.pomery} kpi={kpi} setKpi={setKpi} save={save} backlogy={backlogy} />}
      {tab === "model" && <TabModel sources={{ vzniky: { ...V, vynD: vynimky.map((v) => v.datum) }, triedenie: TP.triedenie, prijem: TP.prijem, distribucia: TP.distribucia }} vynD={vynimky.map((v) => v.datum)} uda={uda} />}

      {toast && <div className={`toast ${toast.err ? "err" : ""}`}>{toast.msg}</div>}
    </div>
  );
}

// ------------------------------------------------------------- 🔮 Predikcia
function TabPredikcia({ D, uda }) {
  const [datum, setDatum] = useState(today());
  const [horizon, setHorizon] = useState(14);
  const { model, prof, daily } = D;
  const jePast = datum <= model.lastDate;
  const pred = jePast ? expectedFor(datum, model, uda) : predictDay(datum, model, uda);
  const skut = jePast ? daily.find((r) => r.datum === datum)?.jbl : undefined;
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
        {jePast && skut != null ? (
          <Card lbl={`Skutočnosť · ${fmtD(datum)} (${DNI[dow(datum)]})`} val={nf.format(skut)} cls="accent"
            sub={`model očakával ${nf.format(pred)} · odchýlka ${((skut / pred - 1) * 100).toFixed(1)} %`} />
        ) : (
          <Card lbl={`${jePast ? "Očakávané (spätne)" : "Predikcia"} na ${fmtD(datum)} (${DNI[dow(datum)]})`} val={nf.format(pred)} cls="accent"
            sub={jePast ? "skutočnosť pre tento deň nie je v dátach – doplň ju v Zadávaní dát"
              : `80 % interval: ${nf.format(pred * (1 - 1.28 * s))} – ${nf.format(pred * (1 + 1.28 * s))} · zohľadňuje skutočnosť posledných dní (korekcia ×${(model.corr ?? 1).toFixed(2)})`} />
        )}
        <Card lbl="Faktor dňa v týždni" val={model.dowF[dow(datum)].toFixed(2)} sub={`deň v mesiaci: ${model.domF[new Date(datum).getUTCDate()].toFixed(2)}`} />
        <Card lbl="Udalosti" val={`×${ev.toFixed(2)}`} cls={ev === 1 ? "" : "warn"} sub={ev === 1 ? "žiadna aktívna udalosť" : "aktívna udalosť upravuje predikciu"} />
        <Card lbl="Denná úroveň modelu" val={nf.format(model.levelNow)} sub={`trend ${model.slope >= 0 ? "+" : ""}${nf.format(model.slope)}/deň, tlmený`} />
      </div>

      <div className="section">
        <h3>Hodinová predikcia · {fmtD(datum)}</h3>
        <div className="chartbox"><Bars data={OP_HOURS.map((h) => ({ x: String(h).padStart(2, "0"), y: pred * p[h] }))} /></div>
        <p className="note">Prevádzkový deň {String(OP_START).padStart(2, "0")}:00 – {String(OP_START).padStart(2, "0")}:00 nasledujúceho dňa.</p>
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
function TabZvoz({ V, TP, staticData, uda, backlogy }) {
  const [datum, setDatum] = useState(today());
  const actual = useMemo(() => new Map(V.daily.map((r) => [r.datum, r.jbl])), [V.daily]);
  const vznikyOf = (d) => actual.get(d) ?? expectedFor(d, V.model, uda);
  const distActual = useMemo(() => new Map(TP.distribucia.daily.map((r) => [r.datum, r.jbl])), [TP.distribucia.daily]);
  const distVol = distActual.get(datum) ?? expectedFor(datum, TP.distribucia.model, uda);
  const z = predictZvoz(datum, staticData.matica, V.prof, vznikyOf);
  const blDen = (backlogy || []).filter((b) => b.na_datum === datum && (b.zdroj || "triedenie") !== "prijem")
    .reduce((a, b) => a + +b.objem * ((b.zdroj || "triedenie") === "vzniky" ? 0.884 : 1), 0);
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
        <Card lbl={`Predikcia zvozov · ${fmtD(datum)} (${DNI[dow(datum)]})`} val={nf.format(z.total + blDen)} cls="blue"
          sub={blDen > 0 ? `vrátane +${nf.format(blDen)} preneseného backlogu` : "jobline na expedíciu"} />
        <Card lbl={`Distribúcia (medzisklad) · ${fmtD(datum)}`} val={nf.format(distVol)}
          sub={`${distActual.has(datum) ? "skutočnosť" : "predikcia"} · práca mimo zákazníckych zvozov`} />
        {[0, 1].map((k) => (
          <Card key={k} lbl={`Z vznikov ${k === 0 ? "v deň zvozu" : fmtD(days[k])} (D${-k})`}
            val={nf.format(z.contrib[k])}
            sub={`${nf1.format((z.contrib[k] / z.total) * 100)} % objemu · vzniky: ${nf.format(vznikyOf(days[k]))}${actual.has(days[k]) ? " (skutočnosť)" : " (model)"}`} />
        ))}
      </div>

      <div className="section">
        <h3>Hodinový profil zvozov · {fmtD(datum)}</h3>
        <div className="chartbox">
          <Bars color="var(--blue)" data={OP_HOURS.map((h) => ({ x: String(h).padStart(2, "0"), y: z.total * staticData.zvozProfil[h] }))} />
        </div>
        <p className="note">Zvozy odchádzajú prevažne v noci (špička 2:00–5:00) – profil z posledných 60 dní zvozov.</p>
      </div>

      <div className="section">
        <h3>Zvozy · najbližších 7 dní</h3>
        <div className="chartbox">
          <Bars color="var(--blue)" data={Array.from({ length: 7 }, (_, i) => {
            const d = addDays(today(), i);
            const b7 = (backlogy || []).filter((b) => b.na_datum === d && (b.zdroj || "triedenie") !== "prijem")
              .reduce((a, b) => a + +b.objem * ((b.zdroj || "triedenie") === "vzniky" ? 0.884 : 1), 0);
            return { x: `${fmtD(d)} ${DNI[dow(d)]}`, y: predictZvoz(d, staticData.matica, V.prof, vznikyOf).total + b7, hl: b7 > 0 };
          })} />
          <div className="legend"><span><i style={{ background: "var(--blue)" }} />predikcia</span><span><i style={{ background: "var(--amber)" }} />deň s preneseným backlogom</span></div>
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
            {Array.from({ length: 24 }, (_, i) => (OP_START + i + 1) % 24).map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00{h <= OP_START ? " (+1 deň)" : ""}</option>)}
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
              <Lines xLabels={Array.from({ length: 24 }, (_, i) => String((OP_START + i + 1) % 24).padStart(2, "0"))} series={[
                { color: "var(--muted)", points: cp.map((v) => v * r.eod) },
                { color: "var(--green)", dots: true, points: Array.from({ length: 24 }, (_, i) => ((OP_START + i + 1) % 24 === H ? vznik : null)) },
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
  const [poHodinach, setPoHodinach] = useState(false);
  const [hodiny, setHodiny] = useState(Array(24).fill(""));
  const [anomHod, setAnomHod] = useState(Array(24).fill(false));
  const zazSrc = zaznamy.filter((z) => (z.zdroj || "triedenie") === src);
  const COLS = ["datum", "hodina", "joblines", "poznamka", "zdroj", "anomalia"];
  const VCOLS = ["datum", "typ", "popis", "hodiny"];
  const sumHodin = hodiny.reduce((a, v) => a + (+v || 0), 0);
  const anomCnt = anomHod.filter(Boolean).length;

  const uloz = () => {
    const rest = zaznamy.filter((z) => !(z.datum === datum && (z.zdroj || "triedenie") === src));
    const pozn = anom !== "Žiadna" ? anom : "";
    let rows;
    if (poHodinach && sumHodin > 0) {
      rows = [...rest, ...OP_HOURS.map((h, i) => ({
        datum, hodina: h, joblines: +hodiny[i] || 0, poznamka: pozn, zdroj: src,
        anomalia: anom !== "Žiadna" && anomHod[i] ? 1 : "",
      })).filter((r) => r.joblines > 0 || r.anomalia === 1)];
    } else {
      rows = [...rest, { datum, hodina: "", joblines: total, poznamka: pozn, zdroj: src, anomalia: "" }];
    }
    save("zaznamy.csv", rows, COLS, `data: záznam JBL ${datum} (${src})`, setZaznamy);
    if (anom !== "Žiadna") {
      const affReal = poHodinach ? OP_HOURS.filter((h, i) => anomHod[i]) : [];
      const vrest = vynimky.filter((v) => v.datum !== datum);
      save("vynimky.csv", [...vrest, { datum, typ: anom, popis: "zadané pri vklade dát", hodiny: affReal.join(",") }],
        VCOLS, `data: výnimka ${datum} – ${anom}${affReal.length ? ` (${affReal.length} h)` : ""}`, setVynimky);
    }
  };
  const zmaz = (d) => {
    const rows = zaznamy.filter((z) => !(z.datum === d && (z.zdroj || "triedenie") === src));
    save("zaznamy.csv", rows, COLS, `data: vymazaný záznam ${d} (${src})`, setZaznamy);
  };

  return (
    <>
      <p className="note">Spätné zadanie skutočných jobline pre zdroj <b>{src}</b>. Záznam prepíše baseline pre daný deň.
        Anomália obmedzená na konkrétne hodiny deň z modelu nevyhodí – postihnuté hodiny sa dopočítajú z profilu
        a deficit sa vyčísli ako backlog (záložka Anomálie).</p>
      <div className="frm">
        <div className="fld"><label>Dátum (prevádzkový deň)</label><input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} /></div>
        <div className="fld"><label>Joblines spolu (deň)</label>
          <input type="number" min="0" step="100" value={poHodinach ? sumHodin : (total || "")} disabled={poHodinach}
            onChange={(e) => setTotal(+e.target.value || 0)} /></div>
        <div className="fld"><label>Anomália (voliteľné)</label>
          <select value={anom} onChange={(e) => setAnom(e.target.value)}>
            <option>Žiadna</option>{TYPY_VYNIMIEK.map((t) => <option key={t}>{t}</option>)}
          </select></div>
        <button className="btn" disabled={poHodinach ? sumHodin === 0 : !total} onClick={uloz}>💾 Uložiť záznam</button>
      </div>
      <div className="frm" style={{ marginTop: 10 }}>
        <label style={{ fontSize: 13, color: "var(--muted)", display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={poHodinach} onChange={(e) => setPoHodinach(e.target.checked)} />
          Zadať po hodinách (prevádzkový deň 06:00 → 05:00)
        </label>
      </div>
      {poHodinach && (
        <>
          {anom !== "Žiadna" && <p className="note" style={{ color: "var(--amber)" }}>⚠️ Zaškrtni pri hodinách, ktoré boli ovplyvnené anomáliou „{anom}“ ({anomCnt} označených).</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 6, marginTop: 8 }}>
            {OP_HOURS.map((h, i) => (
              <div className="fld" key={h} style={anomHod[i] && anom !== "Žiadna" ? { outline: "1px solid var(--amber)", borderRadius: 8, padding: 4 } : { padding: 4 }}>
                <label>{String(h).padStart(2, "0")}:00{h < OP_START ? " (+1)" : ""}</label>
                <input type="number" min="0" style={{ minWidth: 0 }} value={hodiny[i]}
                  onChange={(e) => setHodiny(hodiny.map((v, j) => (j === i ? e.target.value : v)))} />
                {anom !== "Žiadna" && (
                  <label style={{ fontSize: 10.5, color: anomHod[i] ? "var(--amber)" : "var(--muted)", display: "flex", gap: 4, alignItems: "center", cursor: "pointer" }}>
                    <input type="checkbox" checked={anomHod[i]} onChange={(e) => setAnomHod(anomHod.map((v, j) => (j === i ? e.target.checked : v)))} />
                    anomália
                  </label>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section">
        <h3>Zadané záznamy · {src} ({new Set(zazSrc.map((z) => z.datum)).size} dní)</h3>
        {zazSrc.length ? (
          <table className="t"><thead><tr><th>Dátum</th><th>Joblines</th><th>Anomália</th><th /></tr></thead>
            <tbody>{[...new Set(zazSrc.map((z) => z.datum))].sort().reverse().map((d) => {
              const rs = zazSrc.filter((z) => z.datum === d);
              const suma = rs.reduce((a, z) => a + (+z.joblines || 0), 0);
              const an = rs.find((z) => z.poznamka)?.poznamka;
              const anH = rs.filter((z) => String(z.anomalia) === "1").length;
              return (
                <tr key={d}><td>{fmtD(d)}{d.slice(0, 4)}</td><td>{nf.format(suma)}</td>
                  <td>{an ? <span className="pill amber">{an}{anH ? ` · ${anH} h` : ""}</span> : "–"}</td>
                  <td><button className="btn ghost" onClick={() => zmaz(d)}>🗑️</button></td></tr>
              );
            })}</tbody></table>
        ) : <p className="note">Zatiaľ žiadne používateľské záznamy – model beží na baseline dátach.</p>}
      </div>
    </>
  );
}

// -------------------------------------------------------- ⚠️ Anomálie
function TabAnomalie({ D, uda, src, vynimky, setVynimky, save, kpi, pomery, backlogy, setBacklogy }) {
  const BCOLS = ["z_datum", "na_datum", "objem", "zdroj", "poznamka"];
  const [thr, setThr] = useState(25);
  const [datum, setDatum] = useState(addDays(today(), -1));
  const [typ, setTyp] = useState(TYPY_VYNIMIEK[0]);
  const [popis, setPopis] = useState("");
  const [selHod, setSelHod] = useState([]);
  const [blDatum, setBlDatum] = useState("");
  const { daily, model, prof, hourly, part } = D;
  const VCOLS = ["datum", "typ", "popis", "hodiny"];
  const vmap = new Map(vynimky.map((v) => [v.datum, v]));
  const anom = daily
    .map((r) => ({ ...r, ocak: expectedFor(r.datum, model, uda) }))
    .map((r) => ({ ...r, dev: r.jbl / r.ocak - 1 }))
    .filter((r) => Math.abs(r.dev) >= thr / 100)
    .sort((a, b) => (a.datum < b.datum ? 1 : -1));
  const bez = anom.filter((r) => !vmap.has(r.datum)).length;

  const uloz = () => {
    const rest = vynimky.filter((v) => v.datum !== datum);
    save("vynimky.csv", [...rest, { datum, typ, popis, hodiny: [...selHod].sort((a, b) => a - b).join(",") }],
      VCOLS, `data: výnimka ${datum} – ${typ}${selHod.length ? ` (${selHod.length} h)` : ""}`, setVynimky);
  };
  const zmaz = (d) => save("vynimky.csv", vynimky.filter((v) => v.datum !== d), VCOLS, `data: odstránená výnimka ${d}`, setVynimky);
  const togHod = (h) => setSelHod(selHod.includes(h) ? selHod.filter((x) => x !== h) : [...selHod, h]);

  // ---- backlog: čiastočné výnimky s hodinami
  const partSorted = [...part].sort((a, b) => (a.datum < b.datum ? 1 : -1));
  const blSel = partSorted.find((p) => p.datum === blDatum) || partSorted[0];
  let bl = null;
  if (blSel) {
    const adjRow = (D.dailyAdj || daily).find((r) => r.datum === blSel.datum);
    const clean = adjRow ? adjRow.jbl : expectedFor(blSel.datum, model, uda);
    bl = { ...backlogForDay(blSel.datum, blSel.hodiny, hourly, clean, prof), clean, vyn: blSel };
  }
  const vykonPre = (p, d) => {
    const o = (kpi || []).find((k) => k.proces === p && k.datum === d);
    if (o && +o.vykon > 0) return +o.vykon;
    const g = (kpi || []).find((k) => k.proces === p && !k.datum);
    return g && +g.vykon > 0 ? +g.vykon : 0;
  };
  const blProcesy = src === "prijem" ? [["Príjem", 1]]
    : [["Pick", (pomery?.Pick ?? 1)], ["Pack", (pomery?.Pack ?? 1)], ["Sort", 1]];
  const blScale = 1; // celý backlog je práca, ktorá sa musí spraviť (zákaznícka aj distribučná)
  const blHodiny = bl ? blProcesy.map(([p, r]) => {
    const v = vykonPre(p, bl.vyn.datum);
    return { p, objem: bl.backlog * r * blScale, vykon: v, hod: v > 0 ? (bl.backlog * r * blScale) / v : null };
  }) : [];
  const blSpolu = blHodiny.reduce((a, x) => a + (x.hod || 0), 0);

  // presun backlogu na najbližšie zvozové sloty: zmeškaný slot -> rovnaká hodina +1 deň
  // (63,6 % objemu reálne odchádza v rovnakej hodine slotu, len v iný deň)
  const blCiele = (() => {
    if (!bl || !slotMap) return [];
    const maxAffIdx = Math.max(...bl.vyn.hodiny.map((h) => (h - OP_START + 24) % 24));
    const acc = new Map(); // `${datum}|${zh}` -> objem
    for (const d of bl.detail) {
      if (d.backlog <= 0) continue;
      const sm = slotMap[String(d.hodina)] || [];
      const tot = sm.reduce((a, s) => a + s.podiel, 0) || 1;
      for (const s of sm) {
        let off = s.off;
        const slotIdx = (s.zh - OP_START + 24) % 24;
        if (off === 0 && slotIdx <= maxAffIdx) off = 1; // slot padol do/pred anomáliu -> ďalší deň
        const cielDatum = addDays(bl.vyn.datum, off);
        const k = `${cielDatum}|${s.zh}`;
        acc.set(k, (acc.get(k) || 0) + d.backlog * (s.podiel / tot));
      }
    }
    return [...acc.entries()].map(([k, o]) => {
      const [datum, zh] = k.split("|");
      return { datum, zh: +zh, objem: o };
    }).filter((x) => x.objem >= 20).sort((a, b) => (a.datum + String(a.zh).padStart(2, "0") < b.datum + String(b.zh).padStart(2, "0") ? -1 : 1));
  })();

  const uzPrenesene = bl && backlogy.some((b) => b.z_datum === bl.vyn.datum && (b.zdroj || "triedenie") === src);
  const prenesBacklog = () => {
    if (!bl) return;
    const perDay = new Map();
    for (const c of blCiele) perDay.set(c.datum, (perDay.get(c.datum) || 0) + c.objem);
    const rest = backlogy.filter((b) => !(b.z_datum === bl.vyn.datum && (b.zdroj || "triedenie") === src));
    const rows = [...rest, ...[...perDay.entries()].map(([na_datum, o]) => ({
      z_datum: bl.vyn.datum, na_datum, objem: Math.round(o), zdroj: src, poznamka: bl.vyn.typ,
    }))];
    save("backlog.csv", rows, BCOLS, `data: presun backlogu ${bl.vyn.datum}`, setBacklogy);
  };

  return (
    <>
      <div className="frm" style={{ marginBottom: 10 }}>
        <div className="fld"><label>Prah odchýlky: ±{thr} %</label><input type="range" min="10" max="50" value={thr} onChange={(e) => setThr(+e.target.value)} /></div>
      </div>
      <p className="note">Nájdených <b>{anom.length}</b> dní mimo ±{thr} % od modelu, z toho <span className="bad">{bez} bez priradenej výnimky</span>.
        Výnimka na celý deň sa z tréningu vylúči; výnimka obmedzená na hodiny deň opraví dopočtom a zvyšok dňa trénuje ďalej.</p>
      <table className="t"><thead><tr><th>Dátum</th><th>Skutočnosť</th><th>Očakávané</th><th>Odchýlka</th><th>Výnimka</th></tr></thead>
        <tbody>{anom.slice(0, 40).map((r) => (
          <tr key={r.datum}>
            <td>{fmtD(r.datum)}{r.datum.slice(0, 4)} {DNI[dow(r.datum)]}</td>
            <td>{nf.format(r.jbl)}</td><td>{nf.format(r.ocak)}</td>
            <td className={r.dev < 0 ? "bad" : "accent"}>{(r.dev * 100).toFixed(1)} %</td>
            <td>{vmap.has(r.datum) ? <span className="pill gray">{vmap.get(r.datum).typ}{vmap.get(r.datum).hodiny ? ` · h ${vmap.get(r.datum).hodiny}` : ""}</span> : <span className="pill red">nepriradená</span>}</td>
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
        <p className="note" style={{ marginTop: 8 }}>Postihnuté hodiny (voliteľné – nič neoznačené = celý deň):</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {OP_HOURS.map((h) => (
            <button key={h} onClick={() => togHod(h)}
              style={{ padding: "5px 9px", borderRadius: 7, border: "1px solid var(--border)", cursor: "pointer", fontSize: 12, fontFamily: "var(--mono)",
                background: selHod.includes(h) ? "var(--amber)" : "transparent", color: selHod.includes(h) ? "#1b1400" : "var(--muted)" }}>
              {String(h).padStart(2, "0")}{h < OP_START ? "⁺¹" : ""}
            </button>
          ))}
        </div>
      </div>

      {partSorted.length > 0 && (
        <div className="section">
          <h3>Backlog z hodinových anomálií</h3>
          <div className="frm" style={{ marginBottom: 8 }}>
            <div className="fld"><label>Výnimka</label>
              <select value={blSel?.datum || ""} onChange={(e) => setBlDatum(e.target.value)}>
                {partSorted.map((p) => <option key={p.datum} value={p.datum}>{fmtD(p.datum)}{p.datum.slice(0, 4)} · {p.typ} · h {p.hodiny.join(",")}</option>)}
              </select></div>
          </div>
          {bl && (
            <>
              <div className="grid g4">
                <Card lbl="Backlog (nespracované JBL)" val={nf.format(bl.backlog)} cls="warn"
                  sub={bl.maHodinoveData ? `oproti čistému očakávaniu ${nf.format(bl.clean)}` : "bez hodinových dát – ráta sa plný výpadok hodín"} />
                <Card lbl="Postihnuté hodiny" val={bl.vyn.hodiny.length} sub={bl.vyn.hodiny.map((h) => String(h).padStart(2, "0")).join(", ")} />
                <Card lbl="Človekohodiny na dobehnutie" val={blSpolu > 0 ? nf1.format(blSpolu) + " h" : "–"} cls="accent"
                  sub={blSpolu > 0 ? `≈ ${nf1.format(blSpolu / 8)} ľudí na 8h zmenu navyše` : "doplň výkony v záložke KPI"} />
                <Card lbl="Dopad" val="+1 deň" sub="objem stráca prioritu a čaká na nasledujúci zvoz – práca nezmizla, len sa posunula" />
              </div>
              <table className="t" style={{ marginTop: 10 }}><thead><tr><th>Proces</th><th>Backlog objem</th><th>Výkon (JBL/os/h)</th><th>Hodiny navyše</th></tr></thead>
                <tbody>{blHodiny.map((x) => (
                  <tr key={x.p}><td style={{ fontFamily: "var(--sans)" }}>{x.p}</td><td>{nf.format(x.objem)}</td>
                    <td>{x.vykon || "–"}</td><td className="accent" style={{ fontWeight: 650 }}>{x.hod != null ? nf1.format(x.hod) + " h" : "chýba výkon"}</td></tr>
                ))}</tbody></table>
              {src === "vzniky" && <p className="note">Backlog zahŕňa aj distribučné jobline (medzisklad, ~12 % objemu) – tá práca sa musí spraviť tak či tak; na zvozové sloty nižšie sa viaže expedičná časť, distribučná sa dobieha nasledujúci deň mimo zákazníckych zvozov.</p>}

              <h3 style={{ marginTop: 16 }}>Presun na najbližšie zvozy</h3>
              <p className="note">Nespracovaný objem stráca prioritu a čaká na ďalší zvoz svojej linky – zmeškaný slot ide na rovnakú hodinu nasledujúceho dňa (podľa dát 64 % objemu drží hodinu slotu). Rozpad podľa cieľových zvozov:</p>
              <table className="t"><thead><tr><th>Cieľový deň</th><th>Zvoz (slot)</th><th>Objem</th></tr></thead>
                <tbody>{blCiele.slice(0, 12).map((c, i) => (
                  <tr key={i}><td>{fmtD(c.datum)}{c.datum.slice(0, 4)} {DNI[dow(c.datum)]}{c.datum === addDays(bl.vyn.datum, 1) ? " (D+1)" : c.datum === bl.vyn.datum ? " (D)" : ""}</td>
                    <td>{String(c.zh).padStart(2, "0")}:00</td><td>{nf.format(c.objem)}</td></tr>
                ))}</tbody></table>
              <div className="frm" style={{ marginTop: 10 }}>
                <button className="btn" disabled={uzPrenesene} onClick={prenesBacklog}>📤 Preniesť backlog do plánu ({[...new Set(blCiele.map((c) => c.datum))].map((d) => fmtD(d)).join(", ")})</button>
                {uzPrenesene && <span className="note" style={{ alignSelf: "center" }}>✓ už prenesené – zrušiť sa dá v zozname nižšie</span>}
              </div>
              <p className="note">Prenesený backlog sa pripočíta k objemom v záložkách KPI (človekohodiny) a Zvozy pre cieľové dni.</p>
            </>
          )}
        </div>
      )}

      {backlogy.length > 0 && (
        <div className="section">
          <h3>Prenesené backlogy ({backlogy.length})</h3>
          <table className="t"><thead><tr><th>Z dňa</th><th>Na deň</th><th>Objem</th><th>Zdroj</th><th>Pôvod</th><th /></tr></thead>
            <tbody>{[...backlogy].sort((a, b) => (a.na_datum < b.na_datum ? 1 : -1)).map((b, i) => (
              <tr key={i}><td>{fmtD(b.z_datum)}</td><td className="warn">{fmtD(b.na_datum)}</td><td>{nf.format(+b.objem)}</td>
                <td><span className="pill gray">{b.zdroj}</span></td><td style={{ fontFamily: "var(--sans)" }}>{b.poznamka}</td>
                <td><button className="btn ghost" onClick={() => {
                  const rows = backlogy.filter((_, j) => j !== i);
                  save("backlog.csv", rows, BCOLS, `data: zrušený backlog ${b.z_datum}`, setBacklogy);
                }}>🗑️</button></td></tr>
            ))}</tbody></table>
        </div>
      )}

      {vynimky.length > 0 && (
        <div className="section">
          <h3>Evidované výnimky ({vynimky.length})</h3>
          <table className="t"><thead><tr><th>Dátum</th><th>Typ</th><th>Hodiny</th><th>Popis</th><th /></tr></thead>
            <tbody>{[...vynimky].sort((a, b) => (a.datum < b.datum ? 1 : -1)).map((v) => (
              <tr key={v.datum}><td>{fmtD(v.datum)}{v.datum.slice(0, 4)}</td><td>{v.typ}</td>
                <td>{v.hodiny ? <span className="pill amber">{v.hodiny}</span> : <span className="pill gray">celý deň</span>}</td>
                <td style={{ fontFamily: "var(--sans)" }}>{v.popis}</td>
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

// ------------------------------------------------------------ ✅ Kvalita
function TabKvalita({ staticData }) {
  const rows = staticData.kvalitaDenne || [];
  const hod = staticData.kvalitaHodiny;
  const procesy = [...new Set(rows.map((r) => r.proces))].sort();
  const [open, setOpen] = useState(() => new Set());
  const [selProc, setSelProc] = useState("");
  if (!rows.length) return <p className="note">Chýba súbor `kvalita_denne.csv` – vygeneruj ho cez `tools/quality_to_data.py`.</p>;

  const kv = (r) => (1 - (+r.pozde || 0) / (+r.celkem || 1)) * 100;
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const qClass = (v) => (v >= 97 ? "accent" : v >= 92 ? "warn" : "bad");
  const MES = ["jan", "feb", "mar", "apr", "máj", "jún", "júl", "aug", "sep", "okt", "nov", "dec"];
  const monday = (ds) => { const d = new Date(ds + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
  const stvrtrok = (ds) => `${ds.slice(0, 4)} · Q${Math.floor((+ds.slice(5, 7) - 1) / 3) + 1}`;
  const mesiac = (ds) => `${MES[+ds.slice(5, 7) - 1]} ${ds.slice(0, 4)}`;

  const tog = (k) => setOpen((o) => { const n = new Set(o); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const agg = (days) => ({
    kvA: avg(days.map(kv)),
    jbl: days.reduce((a, r) => a + +r.celkem, 0),
    pozde: days.reduce((a, r) => a + +r.pozde, 0),
    n: days.length,
  });
  const group = (days, keyFn) => {
    const m = new Map();
    for (const r of days) { const k = keyFn(r.datum); if (!m.has(k)) m.set(k, []); m.get(k).push(r); }
    return [...m.entries()];
  };

  const Radek = ({ k, label, days, lvl, leaf }) => {
    const a = agg(days);
    const isOpen = open.has(k);
    return (
      <>
        <tr onClick={() => !leaf && tog(k)} style={{ cursor: leaf ? "default" : "pointer" }}>
          <td style={{ paddingLeft: 10 + lvl * 22, fontFamily: "var(--sans)", whiteSpace: "nowrap" }}>
            {!leaf && <span style={{ display: "inline-block", width: 16, color: "var(--muted)" }}>{isOpen ? "▾" : "▸"}</span>}
            {leaf && <span style={{ display: "inline-block", width: 16 }} />}
            {label}
          </td>
          <td className={qClass(a.kvA)} style={{ fontWeight: lvl === 0 ? 700 : 600 }}>{a.kvA.toFixed(1)} %</td>
          <td>{nf.format(a.jbl)}</td>
          <td>{nf.format(a.pozde)}</td>
          <td>{leaf ? DNI[dow(days[0].datum)] : `${a.n} d`}</td>
        </tr>
        {isOpen && !leaf && childRows(k, days, lvl + 1)}
      </>
    );
  };

  const childRows = (parentKey, days, lvl) => {
    if (lvl === 1) return group(days, stvrtrok).map(([q, d]) =>
      <Radek key={parentKey + q} k={parentKey + "|" + q} label={q} days={d} lvl={lvl} />);
    if (lvl === 2) return group(days, mesiac).map(([m, d]) =>
      <Radek key={parentKey + m} k={parentKey + "|" + m} label={m} days={d} lvl={lvl} />);
    if (lvl === 3) return group(days, monday).map(([w, d]) =>
      <Radek key={parentKey + w} k={parentKey + "|" + w} label={`týždeň od ${fmtD(w)}`} days={d} lvl={lvl} />);
    return [...days].sort((a, b) => (a.datum < b.datum ? -1 : 1)).map((r) =>
      <Radek key={parentKey + r.datum} k={parentKey + r.datum} label={fmtD(r.datum) + r.datum.slice(0, 4)} days={[r]} lvl={lvl} leaf />);
  };

  const lastDay = [...new Set(rows.map((r) => r.datum))].sort().pop();

  return (
    <>
      <p className="note">Kvalita = podiel jobline dokončených v limite, prevádzkové dni 06:00–06:00. Agregáty sú <b>priemerom denných kvalít</b> (každý deň rovnaká váha). Klikaním rozbaľuješ proces → štvrťrok → mesiac → týždeň → deň.</p>
      <table className="t">
        <thead><tr><th>Obdobie</th><th>Kvalita (Ø denných)</th><th>Jobline</th><th>Po limite</th><th>Dní</th></tr></thead>
        <tbody>
          {procesy.map((p) => {
            const days = rows.filter((r) => r.proces === p);
            const last = days.find((r) => r.datum === lastDay);
            return <Radek key={p} k={p} days={days} lvl={0}
              label={<>{p} {last && <span className={`pill ${kv(last) >= 97 ? "green" : kv(last) >= 92 ? "amber" : "red"}`} style={{ marginLeft: 8 }}>{fmtD(lastDay)}: {kv(last).toFixed(1)} %</span>}</>} />;
          })}
        </tbody>
      </table>

      {hod && (
        <div className="section">
          <div className="frm" style={{ marginBottom: 8 }}>
            <div className="fld"><label>Proces</label>
              <select value={selProc || procesy[0]} onChange={(e) => setSelProc(e.target.value)}>{procesy.map((p) => <option key={p}>{p}</option>)}</select></div>
          </div>
          <h3>Kvalita podľa hodiny dňa · posledných {hod.dni} dní · priemer denných hodinových kvalít</h3>
          <div className="chartbox">
            <Bars color="var(--amber)" height={200} data={OP_HOURS.map((h) => ({ x: String(h).padStart(2, "0"), y: (hod.profil[selProc || procesy[0]] || [])[h] ?? 0 }))} />
          </div>
          <p className="note">Nízke stĺpce = hodiny, kde sa koncentrujú oneskorené dokončenia.</p>
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------ 🧮 KPI
function TabKPI({ TP, uda, pomery, kpi, setKpi, save, backlogy }) {
  const PROCESY = ["Príjem", "Pick", "Pack", "Sort"];
  const [datum, setDatum] = useState(today());
  const [glob, setGlob] = useState(null);   // plošné výkony {proces: str}
  const [denne, setDenne] = useState(null); // denné overridy {proces: str}
  const [override, setOverride] = useState({});
  const [selProc, setSelProc] = useState("Pick");
  const COLS = ["proces", "vykon", "datum"];

  const globVal = glob ?? Object.fromEntries(PROCESY.map((p) => {
    const r = kpi.find((k) => k.proces === p && !k.datum);
    return [p, r ? String(r.vykon) : ""];
  }));
  const denVal = denne ?? Object.fromEntries(PROCESY.map((p) => {
    const r = kpi.find((k) => k.proces === p && k.datum === datum);
    return [p, r ? String(r.vykon) : ""];
  }));
  const vykEff = (p) => (+denVal[p] > 0 ? +denVal[p] : +globVal[p] > 0 ? +globVal[p] : 0);

  const ulozVsetko = () => {
    const rows = [];
    for (const p of PROCESY) if (globVal[p] !== "") rows.push({ proces: p, vykon: globVal[p], datum: "" });
    for (const k of kpi) if (k.datum && k.datum !== datum) rows.push(k); // ostatné denné overridy zachovaj
    for (const p of PROCESY) if (denVal[p] !== "") rows.push({ proces: p, vykon: denVal[p], datum });
    save("kpi.csv", rows, COLS, `data: KPI výkony (plošné + ${datum})`, setKpi);
  };

  const blNaDen = (backlogy || []).filter((b) => b.na_datum === datum);
  const blPre = (p) => blNaDen.reduce((a, b) => {
    const zdr = b.zdroj || "triedenie";
    if (p === "Príjem") return a + (zdr === "prijem" ? +b.objem : 0);
    if (zdr === "prijem") return a;
    return a + +b.objem * (pomery[p] ?? 1) * (zdr === "vzniky" ? 0.884 : 1);
  }, 0);
  const objemAuto = (p) => {
    const base = p === "Príjem" ? expectedFor(datum, TP.prijem.model, uda)
      : expectedFor(datum, TP.triedenie.model, uda) * (pomery[p] ?? 1);
    return base + blPre(p);
  };
  const objem = (p) => (override[p] !== undefined && override[p] !== "" ? +override[p] : objemAuto(p));
  const hodiny = (p) => (vykEff(p) > 0 ? objem(p) / vykEff(p) : null);
  const spolu = PROCESY.reduce((a, p) => a + (hodiny(p) || 0), 0);

  const prof = selProc === "Príjem" ? TP.prijem.prof : TP.triedenie.prof;
  const p24 = prof[String(dow(datum) >= 5)];
  const selVyk = vykEff(selProc) || null;
  const inp = { width: 90, background: "#0d1117", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 8px", fontFamily: "var(--mono)" };

  return (
    <>
      <p className="note">
        <b>Plošné výkony</b> platia vždy; <b>denná úprava</b> ich pre vybraný deň prepíše (napr. zaučanie, oslabená zmena).
        Človekohodiny = objem ÷ efektívny výkon. Objemy sa predvypĺňajú z modelu a dajú sa prepísať.
      </p>
      <div className="frm" style={{ marginBottom: 12 }}>
        <div className="fld"><label>Prevádzkový deň</label>
          <input type="date" value={datum} onChange={(e) => { setDatum(e.target.value); setDenne(null); setOverride({}); }} /></div>
        <button className="btn" onClick={ulozVsetko}>💾 Uložiť výkony</button>
      </div>

      {blNaDen.length > 0 && (
        <p className="note" style={{ color: "var(--amber)" }}>
          📤 V objemoch dňa {fmtD(datum)} je zahrnutý prenesený backlog ({blNaDen.length} {blNaDen.length === 1 ? "položka" : "položky"}, spolu {nf.format(blNaDen.reduce((a, b) => a + +b.objem, 0))} JBL) – spravuje sa v záložke Anomálie.
        </p>
      )}
      <table className="t">
        <thead><tr><th>Proces</th><th>Plošný výkon</th><th>Úprava pre {fmtD(datum)}</th><th>Efektívny</th><th>Objem (JBL)</th><th>Človekohodiny</th></tr></thead>
        <tbody>
          {PROCESY.map((p) => (
            <tr key={p}>
              <td style={{ fontFamily: "var(--sans)" }}>{p}{p !== "Príjem" && pomery[p] && pomery[p] !== 1 ? ` (×${pomery[p].toFixed(2)})` : ""}</td>
              <td><input type="number" min="0" placeholder="zadaj" style={inp} value={globVal[p]}
                onChange={(e) => setGlob({ ...globVal, [p]: e.target.value })} /></td>
              <td><input type="number" min="0" placeholder="–" style={{ ...inp, borderColor: denVal[p] !== "" ? "var(--amber)" : "var(--border)" }} value={denVal[p]}
                onChange={(e) => setDenne({ ...denVal, [p]: e.target.value })} /></td>
              <td className={denVal[p] !== "" ? "warn" : ""} style={{ fontWeight: 650 }}>{vykEff(p) || "–"}</td>
              <td><input type="number" min="0" step="100" style={{ ...inp, width: 110 }}
                value={override[p] !== undefined && override[p] !== "" ? override[p] : Math.round(objemAuto(p))}
                onChange={(e) => setOverride({ ...override, [p]: e.target.value })} /></td>
              <td className={hodiny(p) != null ? "accent" : ""} style={{ fontWeight: 650 }}>
                {hodiny(p) != null ? nf1.format(hodiny(p)) + " h" : "–"}</td>
            </tr>
          ))}
          <tr>
            <td style={{ fontFamily: "var(--sans)", fontWeight: 650 }}>Spolu</td><td /><td /><td />
            <td>{nf.format(PROCESY.reduce((a, p) => a + objem(p), 0))}</td>
            <td className="accent" style={{ fontWeight: 700 }}>{spolu > 0 ? nf1.format(spolu) + " h" : "–"}</td>
          </tr>
        </tbody>
      </table>
      {blNaDen.length > 0 && <p className="note" style={{ color: "var(--amber)" }}>⚠️ Objemy zahŕňajú prenesený backlog z {blNaDen.map((b) => fmtD(b.z_datum)).join(", ")} (spolu {nf.format(blNaDen.reduce((a, b) => a + +b.objem, 0))} JBL v zdrojových jednotkách).</p>}
      <p className="note">Pri 8-hodinových zmenách: {spolu > 0 ? `${nf1.format(spolu)} h ≈ ${nf1.format(spolu / 8)} ľudí na deň (bez prestávok a réžie)` : "doplň výkony pre prepočet"}. Denné úpravy sa ukladajú spolu s plošnými tlačidlom Uložiť výkony.</p>

      <div className="section">
        <div className="frm" style={{ marginBottom: 8 }}>
          <div className="fld"><label>Proces pre hodinový plán</label>
            <select value={selProc} onChange={(e) => setSelProc(e.target.value)}>{PROCESY.map((p) => <option key={p}>{p}</option>)}</select></div>
        </div>
        <h3>Potrební ľudia po hodinách · {selProc} · {fmtD(datum)}</h3>
        {selVyk ? (
          <div className="chartbox">
            <Bars color="var(--blue)" data={OP_HOURS.map((h) => ({ x: String(h).padStart(2, "0"), y: (objem(selProc) * p24[h]) / selVyk }))} />
            <p className="note">Hodinový objem ÷ efektívny výkon = počet ľudí v danej hodine (profil {selProc === "Príjem" ? "príjmu" : "triedenia"}, prevádzkový deň).</p>
          </div>
        ) : <p className="note">Zadaj výkon procesu {selProc}, aby sa zobrazil hodinový plán.</p>}
      </div>
    </>
  );
}

// ------------------------------------------------------------ 🧠 Model
function TabModel({ sources, vynD, uda }) {
  const [msrc, setMsrc] = useState("vzniky");
  const D = sources[msrc];
  const { model, prof } = D;
  const [bt, setBt] = useState(null);
  const [btBusy, setBtBusy] = useState(false);
  useEffect(() => { setBt(null); }, [msrc]);
  const runBt = () => {
    setBtBusy(true);
    // výpočet mimo klik-handlera, nech UI stihne prekresliť
    setTimeout(() => {
      setBt(backtest(D.daily, vynD, uda, 30));
      setBtBusy(false);
    }, 30);
  };
  return (
    <>
      <div className="seg" style={{ marginBottom: 12 }}>
        {[["vzniky", "🛒 Vzniky"], ["triedenie", "📦 Triedenie"], ["prijem", "📥 Príjem"], ["distribucia", "🔁 Distribúcia"]].map(([k, l]) =>
          <button key={k} className={msrc === k ? "on" : ""} onClick={() => setMsrc(k)}>{l}</button>)}
      </div>
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
        <Lines height={200} xLabels={OP_HOURS.map((h) => String(h).padStart(2, "0"))} series={[
          { color: "var(--green)", points: OP_HOURS.map((h) => prof["false"][h] * 100) },
          { color: "var(--muted)", points: OP_HOURS.map((h) => prof["true"][h] * 100) },
        ]} />
      </div>
      <div className="section">
        <h3>Backtest · presnosť predikcie „deň vopred“ (posledných 30 dní)</h3>
        <p className="note">Pre každý deň sa model natrénuje len na dátach do predchádzajúceho dňa a predikcia sa porovná so skutočnosťou – presne ako v reálnom použití. Dni s výnimkou sa preskakujú.</p>
        {!bt && <button className="btn" disabled={btBusy} onClick={runBt}>{btBusy ? "Počítam…" : "▶️ Spustiť backtest"}</button>}
        {bt && (
          <>
            <div className="grid g4">
              <Card lbl="MAPE (priem. % chyba)" val={(bt.mape * 100).toFixed(1) + " %"} cls={bt.mape <= 0.08 ? "accent" : bt.mape <= 0.12 ? "warn" : "bad"} sub={`${bt.n} testovaných dní`} />
              <Card lbl="MAE (priem. abs. chyba)" val={nf.format(bt.mae)} sub="jobline na deň" />
              <Card lbl="Dní s chybou do ±5 000" val={`${bt.do5k}/${bt.n}`} />
              <Card lbl="Bias (systematický posun)" val={(bt.bias >= 0 ? "+" : "") + nf.format(bt.bias)} cls={Math.abs(bt.bias) <= 2000 ? "" : "warn"} sub={bt.bias > 2000 ? "model podstreľuje – over promo/udalosti" : bt.bias < -2000 ? "model prestreľuje – over výnimky" : "v norme"} />
            </div>
            <div className="chartbox" style={{ marginTop: 10 }}>
              <div className="legend"><span><i style={{ background: "var(--green)" }} />skutočnosť</span><span><i style={{ background: "var(--muted)" }} />predikcia deň vopred</span></div>
              <Lines height={230} xLabels={bt.dni.map((r) => fmtD(r.datum))} series={[
                { color: "var(--green)", points: bt.dni.map((r) => r.skut) },
                { color: "var(--muted)", points: bt.dni.map((r) => r.pred) },
              ]} />
            </div>
            <table className="t" style={{ marginTop: 10 }}><thead><tr><th>Deň</th><th>Skutočnosť</th><th>Predikcia</th><th>Odchýlka</th></tr></thead>
              <tbody>{[...bt.dni].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 6).map((r) => (
                <tr key={r.datum}><td>{fmtD(r.datum)} {DNI[dow(r.datum)]}</td><td>{nf.format(r.skut)}</td><td>{nf.format(r.pred)}</td>
                  <td className={Math.abs(r.pct) >= 0.1 ? "bad" : "warn"}>{(r.pct * 100).toFixed(1)} %</td></tr>
              ))}</tbody></table>
            <p className="note">Tabuľka: 6 najhorších dní – kandidáti na chýbajúcu udalosť (promo) alebo výnimku (výpadok).</p>
          </>
        )}
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
