// Prevod Excel exportov (OLAP_PREDICTION, VOLUMES, QUALITY) na dátové súbory appky.
// Rovnaká logika ako skripty v tools/, len beží v prehliadači cez SheetJS.

const RX_DH = /^\d{2}\.\d{2}\.\d{4} \d{1,2}$/;
const ZRELE_OD = "2025-10-01";
const ZVOZ_DOBEH_DNI = 6;
const PROFIL_DNI = 60;
const POMERY_DNI = 60;
const KVALITA_HODINY_DNI = 30;

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

// "19.08.2025 10" -> Date (UTC)
function parseDH(s) {
  const [dat, h] = s.split(" ");
  const [dd, mm, yyyy] = dat.split(".");
  return new Date(Date.UTC(+yyyy, +mm - 1, +dd, +h));
}
// prevádzkový deň 06:00–06:00
const opDay = (dt) => iso(new Date(dt.getTime() - 6 * 3600000));
const excelDate = (v) => (v instanceof Date ? v : new Date(Math.round((v - 25569) * 86400000)));

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  if (!s.length) return 0;
  return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const csv = (hlavicka, riadky) => [hlavicka.join(","), ...riadky.map((r) => r.join(","))].join("\n") + "\n";

// ---------------------------------------------------------------- rozpoznanie
export function detekuj(ws, XLSX) {
  const head = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false }).slice(0, 40);
  // OLAP: prvý stĺpec sú dátumy s hodinou ("19.08.2025 10")
  if (head.some((r) => RX_DH.test(String(r[0] ?? "").trim()))) return "olap";
  // VOLUMES aj QUALITY majú rovnaké hlavičky – rozlišuje ich obsah stĺpca Proces_
  const vzorka = XLSX.utils.sheet_to_json(ws, { raw: true }).slice(0, 300).map((r) => String(r["Proces_"] ?? ""));
  if (vzorka.some((x) => x.startsWith("Kvalita |"))) return "quality";
  if (vzorka.some((x) => x.startsWith("Výtlak |"))) return "volumes";
  return null;
}

// ------------------------------------------------------------------ OLAP
export function prevodOlap(ws, XLSX) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, raw: false });
  const zaznamy = [];
  let kat = null, vznik = null, plan = null;
  for (let i = 0; i < rows.length; i++) {
    const s = String(rows[i][0] ?? "").trim();
    const c = rows[i][1];
    if (!RX_DH.test(s)) {
      if (s === "Expedice" || s === "Distribuce") kat = s;
      continue;
    }
    if (c === undefined || c === null || c === "") {
      const nx = rows[i + 1];
      const nxNan = nx && RX_DH.test(String(nx[0] ?? "").trim()) && (nx[1] === undefined || nx[1] === null || nx[1] === "");
      if (nxNan) vznik = s; else plan = s;
    } else {
      zaznamy.push({ kat, vznik, plan, real: s, pocet: Math.round(+c) });
    }
  }
  if (!zaznamy.length) throw new Error("OLAP: nenašli sa žiadne dátové riadky.");

  const cache = new Map();
  const dt = (s) => { if (!cache.has(s)) cache.set(s, parseDH(s)); return cache.get(s); };
  for (const z of zaznamy) {
    z.vznikDt = dt(z.vznik); z.planDt = dt(z.plan); z.realDt = dt(z.real);
    z.planNan = z.plan.startsWith("01.01.1900");
    z.realNan = z.real.startsWith("01.01.1900");
  }

  const subory = {};
  const maxVznik = zaznamy.reduce((a, z) => (z.vznikDt > a ? z.vznikDt : a), zaznamy[0].vznikDt);

  // vzniky (Expedice) + distribúcia (Distribuce), kalendárne dni a hodiny
  for (const [kategoria, nazov] of [["Expedice", "vzniky_hodinove.csv"], ["Distribuce", "distribucia_hodinove.csv"]]) {
    const m = new Map();
    for (const z of zaznamy) {
      if (z.kat !== kategoria) continue;
      const k = `${iso(z.vznikDt)}|${z.vznikDt.getUTCHours()}`;
      m.set(k, (m.get(k) || 0) + z.pocet);
    }
    const dni = new Map();
    for (const k of m.keys()) { const d = k.split("|")[0]; dni.set(d, (dni.get(d) || 0) + 1); }
    const posl = [...dni.keys()].sort().pop();
    const neuplny = posl && dni.get(posl) < 20 ? posl : null;
    const riadky = [...m.entries()]
      .map(([k, v]) => { const [d, h] = k.split("|"); return [d, +h, v]; })
      .filter((r) => r[0] !== neuplny)
      .sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] < b[0] ? -1 : 1));
    subory[nazov] = csv(["datum", "hodina", "joblines"], riadky);
  }

  // matica zvozov – len expedícia, zrelé obdobie
  const koniec = addDays(maxVznik, -ZVOZ_DOBEH_DNI);
  const zrele = zaznamy.filter((z) => z.kat === "Expedice" && iso(z.vznikDt) >= ZRELE_OD && z.vznikDt < koniec);
  const matica = {};
  for (let h = 0; h < 24; h++) {
    const g = zrele.filter((z) => z.vznikDt.getUTCHours() === h);
    const tot = g.reduce((a, z) => a + z.pocet, 0);
    const disp = g.filter((z) => !z.realNan &&
      Date.parse(opDay(z.realDt)) >= Date.parse(opDay(z.vznikDt)));
    const dtot = disp.reduce((a, z) => a + z.pocet, 0);
    const podla = [0, 1, 2].map((k) => disp.filter((z) => {
      const dd = Math.round((Date.parse(opDay(z.realDt)) - Date.parse(opDay(z.vznikDt))) / 86400000);
      return dd === k;
    }).reduce((a, z) => a + z.pocet, 0));
    const r3 = Math.max(dtot - podla[0] - podla[1] - podla[2], 0);
    matica[h] = {
      expFrac: tot ? +(dtot / tot).toFixed(4) : 0.9,
      d0: dtot ? +(podla[0] / dtot).toFixed(4) : 0,
      d1: dtot ? +(podla[1] / dtot).toFixed(4) : 0,
      d2: dtot ? +(podla[2] / dtot).toFixed(4) : 0,
      d3: dtot ? +(r3 / dtot).toFixed(4) : 0,
    };
  }

  const dispAll = zrele.filter((z) => !z.realNan);
  const maxReal = dispAll.reduce((a, z) => (z.realDt > a ? z.realDt : a), dispAll[0].realDt);
  const poslX = dispAll.filter((z) => z.realDt >= addDays(maxReal, -PROFIL_DNI));
  const prof = Array(24).fill(0);
  for (const z of poslX) prof[z.realDt.getUTCHours()] += z.pocet;
  const psum = prof.reduce((a, b) => a + b, 0) || 1;
  const zvozProfil = prof.map((v) => +(v / psum).toFixed(4));

  // harmonogram zvozov podľa dňa v týždni
  const harmonogram = {};
  for (let dw = 0; dw < 7; dw++) {
    const g = poslX.filter((z) => { const d = new Date(Date.parse(opDay(z.realDt))); return (d.getUTCDay() + 6) % 7 === dw; });
    const s = new Map();
    for (const z of g) s.set(z.realDt.getUTCHours(), (s.get(z.realDt.getUTCHours()) || 0) + z.pocet);
    const tot = [...s.values()].reduce((a, b) => a + b, 0) || 1;
    harmonogram[dw] = [...s.entries()]
      .map(([h, c]) => ({ h, podiel: +(c / tot).toFixed(4) }))
      .filter((x) => x.podiel >= 0.005)
      .sort((a, b) => b.podiel - a.podiel);
  }

  // mapa vznik hodina -> cieľové sloty (hodina + posun prevádzkových dní)
  const slotMap = {};
  for (let h = 0; h < 24; h++) {
    const g = zrele.filter((z) => !z.realNan && z.vznikDt.getUTCHours() === h);
    const s = new Map();
    for (const z of g) {
      const off = Math.round((Date.parse(opDay(z.realDt)) - Date.parse(opDay(z.vznikDt))) / 86400000);
      if (off < 0 || off > 3) continue;
      const k = `${z.realDt.getUTCHours()}|${off}`;
      s.set(k, (s.get(k) || 0) + z.pocet);
    }
    const tot = [...s.values()].reduce((a, b) => a + b, 0) || 1;
    const zoradene = [...s.entries()].sort((a, b) => b[1] - a[1]);
    const top = []; let cum = 0;
    for (const [k, c] of zoradene) {
      const [zh, off] = k.split("|");
      const podiel = c / tot;
      top.push({ zh: +zh, off: +off, podiel: +podiel.toFixed(4) });
      cum += podiel;
      if (cum >= 0.9 || top.length >= 8) break;
    }
    slotMap[h] = top;
  }

  // plnenie plánu
  const pm = zrele.filter((z) => !z.planNan && !z.realNan);
  const ptot = pm.reduce((a, z) => a + z.pocet, 0) || 1;
  const slip = (z) => (z.realDt - z.planDt) / 3600000;
  const planStat = {
    onTime: +(pm.filter((z) => Math.abs(slip(z)) <= 0.5).reduce((a, z) => a + z.pocet, 0) / ptot).toFixed(3),
    sklz24h: +(pm.filter((z) => slip(z) > 20 && slip(z) <= 28).reduce((a, z) => a + z.pocet, 0) / ptot).toFixed(3),
    rovnakaHodina: +(pm.filter((z) => z.realDt.getUTCHours() === z.planDt.getUTCHours()).reduce((a, z) => a + z.pocet, 0) / ptot).toFixed(3),
  };

  subory["zvoz_matica.json"] = JSON.stringify({
    zdroj: `import v appke, vzniky ${ZRELE_OD} – ${iso(koniec)}`,
    matica, zvozProfil, harmonogram, slotMap, plan: planStat,
  });

  const spolu = zaznamy.reduce((a, z) => a + z.pocet, 0);
  return {
    subory,
    suhrn: `${zaznamy.length.toLocaleString("sk")} kombinácií · ${spolu.toLocaleString("sk")} jobline · vzniky do ${iso(maxVznik)} · plnenie plánu ${(planStat.onTime * 100).toFixed(0)} %`,
  };
}

// --------------------------------------------------------------- VOLUMES
export function prevodVolumes(ws, XLSX) {
  const vsetky = XLSX.utils.sheet_to_json(ws, { raw: true, cellDates: true });
  // preč súčtové riadky ("Celkový součet") a riadky bez platného dátumu
  const rows = vsetky.filter((r) => String(r["Proces_"] ?? "").startsWith("Výtlak |")
    && r["Den (datum)"] != null && r["Směna 06-06"] != null);
  if (!rows.length) throw new Error("VOLUMES: nenašli sa riadky s procesmi „Výtlak | …“.");
  const den = (r) => iso(excelDate(r["Den (datum)"]));
  const smena = (r) => iso(excelDate(r["Směna 06-06"]));

  const subory = {};
  const info = [];
  for (const [proces, nazov] of [["Výtlak | 1. Received", "prijem_hodinove.csv"], ["Výtlak | 6. Sorted", "baseline_hodinove.csv"]]) {
    const m = new Map();
    for (const r of rows) {
      if (r["Proces_"] !== proces) continue;
      const k = `${den(r)}|${+r["Hodina"]}`;
      m.set(k, (m.get(k) || 0) + (+r["Celkem"] || 0));
    }
    if (!m.size) continue;
    const riadky = [...m.entries()]
      .map(([k, v]) => { const [d, h] = k.split("|"); return [d, +h, Math.round(v)]; })
      .sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] < b[0] ? -1 : 1));
    subory[nazov] = csv(["datum", "hodina", "joblines"], riadky);
    info.push(`${proces.split("| ")[1]}: ${riadky.length} riadkov`);
  }

  // pomery procesov voči Sorted (medián denných pomerov, posledných N dní)
  const dni = new Map();
  for (const r of rows) {
    const d = smena(r);
    if (!dni.has(d)) dni.set(d, {});
    const o = dni.get(d);
    o[r["Proces_"]] = (o[r["Proces_"]] || 0) + (+r["Celkem"] || 0);
  }
  const zoradene = [...dni.keys()].sort();
  const posl = zoradene.slice(-POMERY_DNI);
  const pomery = { Sort: 1 };
  for (const [proces, key] of [["Výtlak | 4. Picked", "Pick"], ["Výtlak | 5. Packed", "Pack"], ["Výtlak | 1. Received", "Príjem"]]) {
    const r = posl.map((d) => {
      const o = dni.get(d);
      return o[proces] && o["Výtlak | 6. Sorted"] ? o[proces] / o["Výtlak | 6. Sorted"] : null;
    }).filter((x) => x != null);
    if (r.length) pomery[key] = +median(r).toFixed(4);
  }
  subory["procesy_pomery.json"] = JSON.stringify({ dni: POMERY_DNI, pomery_vs_sorted: pomery });

  return { subory, suhrn: `${info.join(" · ")} · pomery Pick ×${pomery.Pick ?? "–"}, Pack ×${pomery.Pack ?? "–"}` };
}

// --------------------------------------------------------------- QUALITY
export function prevodQuality(ws, XLSX) {
  const vsetky = XLSX.utils.sheet_to_json(ws, { raw: true, cellDates: true });
  const rows = vsetky.filter((r) => String(r["Proces_"] ?? "").startsWith("Kvalita |") && r["Směna 06-06"] != null);
  if (!rows.length) throw new Error("QUALITY: nenašli sa riadky s procesmi „Kvalita | …“.");
  const POZDE = "Pozdě dokončené vše";
  const smena = (r) => iso(excelDate(r["Směna 06-06"]));
  const proc = (r) => String(r["Proces_"]).replace("Kvalita | ", "");

  // denná kvalita po procesoch
  const den = new Map();
  for (const r of rows) {
    const k = `${smena(r)}|${proc(r)}`;
    const o = den.get(k) || { c: 0, z: 0 };
    o.c += +r["Celkem"] || 0; o.z += +r[POZDE] || 0;
    den.set(k, o);
  }
  const riadky = [...den.entries()]
    .map(([k, o]) => { const [d, p] = k.split("|"); return [d, p, Math.round(o.c), Math.round(o.z)]; })
    .filter((r) => r[2] > 0)
    .sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1));
  const subory = { "kvalita_denne.csv": csv(["datum", "proces", "celkem", "pozde"], riadky) };

  // hodinový profil = priemer denných hodinových kvalít
  const dniAll = [...new Set(riadky.map((r) => r[0]))].sort();
  // okno posledných N kalendárnych dní (nie N záznamov), rovnako ako konvertor v tools/
  const cut = iso(addDays(new Date(Date.parse(dniAll[dniAll.length - 1])), -KVALITA_HODINY_DNI));
  const perProc = new Map();
  for (const r of rows) {
    const d = smena(r);
    if (d <= cut) continue;
    const p = proc(r), h = +r["Hodina"];
    const key = `${d}|${h}`;           // názov procesu môže sám obsahovať "|"
    const m = perProc.get(p) || new Map();
    const o = m.get(key) || { c: 0, z: 0 };
    o.c += +r["Celkem"] || 0; o.z += +r[POZDE] || 0;
    m.set(key, o); perProc.set(p, m);
  }
  const profil = {};
  for (const [p, m] of perProc) {
    const poHodine = Array.from({ length: 24 }, () => []);
    for (const [key, o] of m) {
      if (o.c <= 0) continue;
      poHodine[+key.split("|")[1]].push((1 - o.z / o.c) * 100);
    }
    profil[p] = poHodine.map((a) => (a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : null));
  }
  subory["kvalita_hodiny.json"] = JSON.stringify({ dni: KVALITA_HODINY_DNI, profil });

  const procesy = [...new Set(riadky.map((r) => r[1]))];
  return { subory, suhrn: `${dniAll.length} dní × ${procesy.length} procesov · do ${dniAll[dniAll.length - 1]}` };
}

export function prevod(typ, ws, XLSX) {
  if (typ === "olap") return prevodOlap(ws, XLSX);
  if (typ === "volumes") return prevodVolumes(ws, XLSX);
  if (typ === "quality") return prevodQuality(ws, XLSX);
  throw new Error("Neznámy formát súboru.");
}

export const POPIS_TYPU = {
  olap: "OLAP – vzniky, distribúcia, matica zvozov",
  volumes: "VOLUMES – príjem, triedenie, pomery procesov",
  quality: "QUALITY – kvalita denne a po hodinách",
};
