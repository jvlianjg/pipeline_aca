/* =================================================================
   ACA · Sistema de Inteligencia — aplicación SPA
   Router por hash + 5 vistas + Chart.js. Vanilla JS.
   ================================================================= */

"use strict";

/* ── Paleta (sincronizada con styles.css) ─────────────────────── */
const C = {
  primary: "#2e4a62",
  secondary: "#1e7a5f",
  teal: "#3a8b8c",
  amber: "#d4953a",
  terra: "#c4523a",
  lav: "#7e6bb0",
  muted: "#9ba3b0",
  border: "#e5e7eb",
};

/* ── Helper HTTP ──────────────────────────────────────────────── */
async function api(path) {
  const res = await fetch("/api/" + path);
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json();
}

/* ── Helpers de render ────────────────────────────────────────── */
const view = () => document.getElementById("view");
const titleEl = () => document.getElementById("page-title");
const loading = `<div class="loading">Cargando…</div>`;

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else e.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return e;
}

function pct(v, d = 1) { return (v * 100).toFixed(d) + "%"; }
function fmt(v, d = 2) { return Number(v).toFixed(d); }
function shortName(s, n = 40) {
  s = s.replace(/\.pdf$/, "").replace(/[_-]/g, " ");
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

/* Mantiene referencias a charts para destruirlos al cambiar de vista. */
let activeCharts = [];
function destroyCharts() {
  activeCharts.forEach((c) => { try { c.destroy(); } catch (_) {} });
  activeCharts = [];
}

/* ── Config base de Chart.js ──────────────────────────────────── */
Chart.defaults.font.family = "'DM Sans', sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.color = "#5c6370";
Chart.defaults.plugins.legend.labels.boxWidth = 10;
Chart.defaults.plugins.legend.labels.boxHeight = 10;

/* ═══════════════════════════════════════════════════════════════
   VISTA: DASHBOARD
   ═══════════════════════════════════════════════════════════════ */
async function viewDashboard() {
  titleEl().textContent = "Dashboard Ejecutivo";
  view().innerHTML = loading;

  const [ov, ts, ici, topics, dist, matches] = await Promise.all([
    api("overview"), api("iii-evolution"), api("ici-channels"),
    api("topics"), api("influence-distribution"), api("recent-matches"),
  ]);

  destroyCharts();
  const root = el("div", {});

  /* ── KPIs ── */
  const deltaCls = ov.iii_variacion >= 0 ? "up" : "down";
  const deltaArrow = ov.iii_variacion >= 0 ? "▲" : "▼";
  const kpis = el("div", { class: "kpi-grid" },
    kpiCard("III Promedio", `${fmt(ov.iii_promedio_pct, 1)}<span class="unit">%</span>`,
      `<span class="kpi-card__delta ${deltaCls}">${deltaArrow} ${Math.abs(ov.iii_variacion)}% vs. inicio</span>`,
      true),
    kpiCard("Publicaciones", `${ov.n_publicaciones}`,
      `<span class="kpi-card__delta neutral">${ov.n_publicaciones_monitoreadas} en monitoreo total</span>`, true),
    kpiCard("Políticas Vinculadas", `${ov.n_politicas_vinculadas}`,
      `<span class="kpi-card__delta neutral">${ov.n_vinculos} vínculos documentados</span>`, false, "mock"),
    kpiCard("ICI Global", `${fmt(ov.ici_global_pct, 1)}<span class="unit">%</span>`,
      `<span class="kpi-card__delta neutral">${ov.n_interacciones} interacciones</span>`, false, "mock"),
  );
  root.appendChild(kpis);

  /* ── Fila 1: Evolución III (2/3) + Distribución donut (1/3) ── */
  const row1 = el("div", { class: "charts-grid" });
  row1.appendChild(chartCard(
    "Evolución del III", "Índice de Impacto de Ideas — últimos 6 meses",
    `<canvas id="ch-iii"></canvas>`, true));
  row1.appendChild(chartCard(
    "Distribución de Influencia", `Canales político vs. mediático · ${ov.n_interacciones} interacciones`,
    `<canvas id="ch-dist"></canvas>`, false, "mock"));
  root.appendChild(row1);

  /* ── Fila 2: Canales de influencia (líneas) ── */
  root.appendChild(chartCard(
    "Canales de Influencia", "ICI-Político vs. ICI-Medios — evolución mensual",
    `<canvas id="ch-ici"></canvas>`, false, "mock"));

  /* ── Fila 3: Temáticas (barras) ── */
  root.appendChild(chartCard(
    "Impacto por Temática", "III medio por área temática (real)",
    `<canvas id="ch-topics"></canvas>`, true));

  /* ── Tabla de coincidencias ── */
  const tbl = tableCard("Coincidencias Recientes", `${matches.total_vinculos} vínculos documento-política`, "mock",
    ["Publicación", "Política", "Institución", "III", "Adopción", "Fecha"],
    matches.policies.slice(0, 8).map((p) => [
      el("span", { class: "doc-name", title: p.publicacion }, shortName(p.publicacion)),
      el("span", {}, p.politica),
      el("span", { class: "muted" }, p.institucion),
      el("span", { class: "num" }, pct(p.iii, 1)),
      adopcionBadge(p.adopcion),
      el("span", { class: "muted" }, fmtDate(p.fecha)),
    ]));
  root.appendChild(tbl);

  view().innerHTML = "";
  view().appendChild(root);

  /* ── Render charts ── */
  activeCharts.push(new Chart(document.getElementById("ch-iii"), {
    type: "line",
    data: {
      labels: ts.months,
      datasets: [{
        label: "III medio",
        data: ts.values,
        borderColor: C.primary,
        backgroundColor: hexA(C.primary, 0.1),
        fill: true, tension: 0.35, borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: C.primary,
      }],
    },
    options: lineOpts({ yFmt: (v) => pct(v, 0), yMin: 0.5, yMax: 0.75 }),
  }));

  activeCharts.push(new Chart(document.getElementById("ch-dist"), {
    type: "doughnut",
    data: {
      labels: ["Político", "Medios"],
      datasets: [{
        data: [dist.politico, dist.medios],
        backgroundColor: [C.primary, C.amber],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: "68%",
      plugins: { legend: { position: "bottom", labels: { padding: 16 } },
        tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.parsed}%` } } },
    },
  }));

  activeCharts.push(new Chart(document.getElementById("ch-ici"), {
    type: "line",
    data: {
      labels: ici.months,
      datasets: [
        lineDs("ICI-Político", ici.ici_politico, C.secondary),
        lineDs("ICI-Medios", ici.ici_medios, C.amber),
      ],
    },
    options: lineOpts({ yFmt: (v) => pct(v, 0) }),
  }));

  activeCharts.push(new Chart(document.getElementById("ch-topics"), {
    type: "bar",
    data: {
      labels: topics.topics.map((t) => t.tema),
      datasets: [{
        label: "III medio",
        data: topics.topics.map((t) => t.iii_medio),
        backgroundColor: topics.topics.map((_, i) => [C.teal, C.primary, C.secondary, C.amber, C.lav, C.terra, "#5b8aa6", "#8fb89a", "#c4a570", "#9d8fc4"][i % 10]),
        borderRadius: 5, barThickness: 18,
      }],
    },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: {
        label: (c) => {
          const t = topics.topics[c.dataIndex];
          return ` III: ${pct(t.iii_medio, 1)} · ${t.n_docs} docs`;
        },
      } } },
      scales: { x: { min: 0.5, max: 0.8, ticks: { callback: (v) => pct(v, 0) } }, y: { ticks: { font: { size: 11 } } } },
    },
  }));
}

/* ═══════════════════════════════════════════════════════════════
   VISTA: ANÁLISIS  (ranking + heatmap — datos reales)
   ═══════════════════════════════════════════════════════════════ */
async function viewAnalisis() {
  titleEl().textContent = "Análisis de Impacto";
  view().innerHTML = loading;

  const [ranking, pairs] = await Promise.all([api("ranking"), api("pairs")]);
  destroyCharts();

  const root = el("div", {});

  /* ── Ranking tabla ── */
  root.appendChild(tableCard(
    "Ranking de Publicaciones por III", `${ranking.length} documentos · datos reales`, "real",
    ["#", "Publicación", "Fecha", "Páginas", "Propuestas", "III medio", ""],
    ranking.map((d, i) => [
      el("span", { class: "muted" }, String(i + 1)),
      el("span", { class: "doc-name", title: d.doc_id }, shortName(d.filename)),
      el("span", { class: "muted" }, fmtDate(d.fecha)),
      el("span", { class: "muted num" }, String(d.n_pages)),
      el("span", { class: "muted num" }, String(d.n_propuestas)),
      el("span", { class: "num" }, pct(d.iii_medio, 1)),
      progressBar(d.iii_medio),
    ])));

  /* ── Heatmap ── */
  root.appendChild(chartCard(
    "Matriz de Similitud III", "Heatmap publicación-publicación (29×29) · datos reales",
    `<div class="controls"><label class="muted" style="font-size:.78rem">Componente:</label>
       <select class="select" id="hm-component">
         <option value="iii">III (total)</option>
         <option value="alineacion">Alineación temática</option>
         <option value="coincidencia">Coincidencia de propuestas</option>
         <option value="temporalidad">Temporalidad</option>
       </select>
       <span class="section-tag" id="hm-info"></span>
     </div>
     <div class="heatmap-wrap"><canvas id="heatmap-canvas"></canvas></div>`,
    false, "real"));

  view().innerHTML = "";
  view().appendChild(root);

  /* ── Top pares tabla ── */
  // Se añade después del heatmap
  const pairsCard = tableCard(
    "Top Pares por III", `${pairs.length} pares más similares · datos reales`, "real",
    ["#", "Fuente", "Blanco", "III"],
    pairs.slice(0, 12).map((p, i) => [
      el("span", { class: "muted" }, String(i + 1)),
      el("span", { class: "doc-name", title: p.fuente }, shortName(p.fuente_file)),
      el("span", { class: "doc-name", title: p.blanco }, shortName(p.blanco_file)),
      el("span", { class: "num" }, pct(p.iii, 1)),
    ]));
  root.appendChild(pairsCard);

  /* ── Cargar heatmap ── */
  const select = document.getElementById("hm-component");
  select.addEventListener("change", () => loadHeatmap(select.value));
  loadHeatmap("iii");
}

async function loadHeatmap(component) {
  const data = await api(`matrix/${component}`);
  const canvas = document.getElementById("heatmap-canvas");
  const info = document.getElementById("hm-info");
  drawHeatmap(canvas, data);
  info.textContent = `máx ${pct(data.max, 1)} · media ${pct(data.mean, 1)}`;
}

function drawHeatmap(canvas, data) {
  const m = data.matrix;
  const n = m.length;
  const labels = data.labels;
  const maxVal = data.max || 1;

  const cell = 28;
  const labelW = 110;
  const labelH = 90;
  const w = labelW + n * cell + 20;
  const h = labelH + n * cell + 20;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");

  // Función de color: navy (bajo) → teal → verde → amber (alto)
  function colorFor(v) {
    if (v <= 0) return "#f5f5f0";
    const t = v / maxVal;
    // interpolar de navy(46,74,98) a amber(212,149,58) pasando por teal
    const stops = [
      [0.0, [46, 74, 98]],
      [0.4, [58, 139, 140]],
      [0.7, [30, 122, 95]],
      [1.0, [212, 149, 58]],
    ];
    for (let i = 0; i < stops.length - 1; i++) {
      if (t <= stops[i + 1][0]) {
        const f = (t - stops[i][0]) / (stops[i + 1][0] - stops[i][0]);
        const [r1, g1, b1] = stops[i][1], [r2, g2, b2] = stops[i + 1][1];
        return `rgb(${Math.round(r1 + f * (r2 - r1))},${Math.round(g1 + f * (g2 - g1))},${Math.round(b1 + f * (b2 - b1))})`;
      }
    }
    return "rgb(212,149,58)";
  }

  // Celdas
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      ctx.fillStyle = colorFor(m[i][j]);
      ctx.fillRect(labelW + j * cell, labelH + i * cell, cell - 1, cell - 1);
    }
  }
  // Etiquetas eje X (columnas, rotadas)
  ctx.font = "10px 'DM Sans'";
  ctx.fillStyle = "#5c6370";
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  for (let i = 0; i < n; i++) {
    ctx.save();
    ctx.translate(labelW + i * cell + cell / 2, labelH - 6);
    ctx.rotate(-Math.PI / 4);
    ctx.textAlign = "left";
    ctx.fillText(labels[i], 0, 0);
    ctx.restore();
  }
  // Etiquetas eje Y (filas)
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  for (let i = 0; i < n; i++) {
    ctx.fillText(labels[i], labelW - 6, labelH + i * cell + cell / 2);
  }
}

/* ═══════════════════════════════════════════════════════════════
   VISTA: CANALES  (ICI por documento — mock con fórmula real)
   ═══════════════════════════════════════════════════════════════ */
async function viewCanales() {
  titleEl().textContent = "Canales de Influencia";
  view().innerHTML = loading;

  const [ici, records, ov] = await Promise.all([
    api("ici-results"), api("ici-records"), api("overview"),
  ]);

  destroyCharts();
  const root = el("div", {});

  // KPIs de canales
  root.appendChild(el("div", { class: "kpi-grid" },
    kpiCard("ICI Global", `${fmt(ov.ici_global_pct, 1)}<span class="unit">%</span>`,
      `<span class="kpi-card__delta neutral">α político = 0.6</span>`, false, "mock"),
    kpiCard("Señales Políticas", `${ici.summary.total_politico}`,
      `<span class="kpi-card__delta neutral">${ici.summary.pct_politico}% del total</span>`, false, "mock"),
    kpiCard("Señales de Medios", `${ici.summary.total_medios}`,
      `<span class="kpi-card__delta neutral">${ici.summary.pct_medios}% del total</span>`, false, "mock"),
    kpiCard("ICI-Político Global", `${pct(ici.summary.ici_politico_global, 1)}`,
      `<span class="kpi-card__delta neutral">audiencias · citaciones · informes</span>`, false, "mock"),
  ));

  // Tabla ICI por documento
  root.appendChild(tableCard(
    "ICI por Publicación", `${ici.results.length} documentos · calculado con fórmula real sobre datos de ejemplo`, "mock",
    ["#", "Publicación", "ICI-Político", "ICI-Medios", "ICI Total", "III medio", ""],
    ici.results.map((r, i) => [
      el("span", { class: "muted" }, String(i + 1)),
      el("span", { class: "doc-name", title: r.doc_id }, shortName(r.doc_id)),
      el("span", { class: "num" }, pct(r.ici_politico, 1)),
      el("span", { class: "num" }, pct(r.ici_medios, 1)),
      el("span", { class: "num", style: "font-weight:700" }, pct(r.ici, 1)),
      el("span", { class: "num muted" }, pct(r.iii_medio, 1)),
      progressBar(r.ici, "amber"),
    ])));

  // Tabla de registros por canal
  const channelCounts = countByChannel(records);
  root.appendChild(tableCard(
    "Señales por Canal", "Distribución de eventos por tipo de canal", "mock",
    ["Canal", "Tipo", "Eventos", ""],
    Object.entries(channelCounts).map(([tipo, info]) => [
      el("span", { class: "muted" }, info.categoria),
      el("span", {}, tipo),
      el("span", { class: "num" }, String(info.count)),
      progressBar(info.count / channelCounts._max, info.color),
    ])));

  view().innerHTML = "";
  view().appendChild(root);
}

function countByChannel(records) {
  const map = {
    "audiencias":        { count: 0, categoria: "Político", color: "primary" },
    "citacion_oficial":  { count: 0, categoria: "Político", color: "primary" },
    "informe_tecnico":   { count: 0, categoria: "Político", color: "primary" },
    "menciones_medios":  { count: 0, categoria: "Medios",   color: "amber" },
    "espacio_opinion":   { count: 0, categoria: "Medios",   color: "amber" },
  };
  records.politico.forEach((r) => { if (map[r.tipo]) map[r.tipo].count++; });
  records.medios.forEach((r) => { if (map[r.tipo]) map[r.tipo].count++; });
  map._max = Math.max(...Object.values(map).map((v) => v.count));
  return map;
}

/* ═══════════════════════════════════════════════════════════════
   VISTA: AUDITORÍA  (metodología + transparencia real/mock)
   ═══════════════════════════════════════════════════════════════ */
async function viewAuditoria() {
  titleEl().textContent = "Auditoría y Metodología";
  view().innerHTML = loading;

  const cfg = await api("config");
  destroyCharts();
  const root = el("div", {});

  root.appendChild(el("div", { class: "method-card", html: `
    <h3>Metodología del III — Índice de Impacto de Ideas</h3>
    <p>El III mide el <strong>potencial de influencia</strong> de una publicación sobre otra,
       combinando tres componentes normalizados en [0, 1]:</p>
    <div class="formula">III(f, b) = ⅓·Alineación(f,b) + ⅓·Coincidencia(f,b) + ⅓·Temporalidad(f,b)</div>
    <h4>Alineación temática</h4>
    <div class="formula">Alineación(f,b) = (cos(emb(f), emb(b)) + 1) / 2</div>
    <p>Similitud coseno entre embeddings del documento fuente y blanco, reescalada de [-1,1] a [0,1].
       Modelo: <code>${cfg.embedding_model}</code> (${cfg.embedding_dim} dim).</p>
    <h4>Coincidencia de propuestas</h4>
    <div class="formula">Coincidencia = media_i [ max_j (cos(p_i, q_j) + 1)/2 ]</div>
    <p>Para cada propuesta del documento fuente, se toma su mejor coincidencia en el documento blanco,
       y se promedian todas.</p>
    <h4>Temporalidad</h4>
    <div class="formula">Temporalidad = max(0, 1 − |Δmeses| / ${cfg.iii.ventana_meses})</div>
    <p>Decaimiento lineal dentro de una ventana de ${cfg.iii.ventana_meses} meses. Simétrico (usa valor absoluto).</p>
    <p class="mt-2"><strong>III medio</strong> = media de la fila de la matriz excluyendo la diagonal → puntaje de ranking por documento.</p>
  `}));

  root.appendChild(el("div", { class: "method-card", html: `
    <h3>Metodología del ICI — Índice de Canales de Influencia</h3>
    <p>El ICI mide la <strong>evidencia observable</strong> de influencia a través de canales políticos y mediáticos:</p>
    <div class="formula">ICI = α·ICI-Político + (1−α)·ICI-Medios &nbsp;&nbsp; con α = ${cfg.ici.alpha_politico}</div>
    <p>Cada sub-índice es la media de señales normalizadas por canal, comprimidas con saturación suave
       <code>x/(1+x)</code>:</p>
    <ul>
      <li><strong>ICI-Político</strong> = media(audiencias, citación oficial, informe técnico)</li>
      <li><strong>ICI-Medios</strong> = media(menciones en medios, espacio de opinión)</li>
    </ul>
    <p>Los canales ausentes cuentan como 0, premiando la diversidad de canales.</p>
  `}));

  // Transparencia: qué es real y qué es mock
  root.appendChild(el("div", { class: "method-card", html: `
    <h3>Transparencia de Datos</h3>
    <p>Este sistema combina datos <strong>reales</strong> (procesados del corpus ACA) con
       <strong>datos de ejemplo</strong> (mock) para ilustrar la visión completa del producto.</p>
    <div class="kv-grid">
      <div class="kv"><div class="kv__label"><span class="badge badge--real">Real</span></div><div class="kv__value">29 publicaciones</div><div class="muted" style="font-size:.78rem">PDFs procesados con el pipeline</div></div>
      <div class="kv"><div class="kv__label"><span class="badge badge--real">Real</span></div><div class="kv__value">741 propuestas</div><div class="muted" style="font-size:.78rem">extraídas por heurística</div></div>
      <div class="kv"><div class="kv__label"><span class="badge badge--real">Real</span></div><div class="kv__value">Matriz III 29×29</div><div class="muted" style="font-size:.78rem">3 componentes calculados</div></div>
      <div class="kv"><div class="kv__label"><span class="badge badge--mock">Ejemplo</span></div><div class="kv__value">15 políticas</div><div class="muted" style="font-size:.78rem">vínculos ilustrativos</div></div>
      <div class="kv"><div class="kv__label"><span class="badge badge--mock">Ejemplo</span></div><div class="kv__value">ICI por documento</div><div class="muted" style="font-size:.78rem">fórmula real, datos mock</div></div>
      <div class="kv"><div class="kv__label"><span class="badge badge--mock">Ejemplo</span></div><div class="kv__value">Serie temporal</div><div class="muted" style="font-size:.78rem">6 meses ilustrativos</div></div>
    </div>
    <p class="mt-2 muted" style="font-size:.8rem">El ICI se calcula con la <strong>fórmula real</strong> del sistema (src/indexing/ici.py) sobre registros de ejemplo.
       Al inyectar datos reales, el cálculo no cambia.</p>
  `}));

  // Parámetros operativos
  root.appendChild(el("div", { class: "method-card", html: `
    <h3>Parámetros Operativos</h3>
    <div class="kv-grid">
      <div class="kv"><div class="kv__label">Peso Alineación</div><div class="kv__value">${fmt(cfg.iii.w_alineacion, 3)}</div></div>
      <div class="kv"><div class="kv__label">Peso Coincidencia</div><div class="kv__value">${fmt(cfg.iii.w_coincidencia, 3)}</div></div>
      <div class="kv"><div class="kv__label">Peso Temporalidad</div><div class="kv__value">${fmt(cfg.iii.w_temporalidad, 3)}</div></div>
      <div class="kv"><div class="kv__label">Ventana temporal</div><div class="kv__value">${cfg.iii.ventana_meses} meses</div></div>
      <div class="kv"><div class="kv__label">α ICI político</div><div class="kv__value">${fmt(cfg.ici.alpha_politico, 2)}</div></div>
      <div class="kv"><div class="kv__label">α ICI medios</div><div class="kv__value">${fmt(cfg.ici.alpha_medios, 2)}</div></div>
    </div>
    <p class="mt-2 muted" style="font-size:.8rem">Los pesos del III son uniformes (⅓ cada uno) por acuerdo inicial. La ventana y los pesos
       deberán calibrarse empíricamente cuando se disponga de datos de política real.</p>
  `}));

  view().innerHTML = "";
  view().appendChild(root);
}

/* ═══════════════════════════════════════════════════════════════
   VISTA: CONFIGURACIÓN
   ═══════════════════════════════════════════════════════════════ */
async function viewConfig() {
  titleEl().textContent = "Configuración del Sistema";
  view().innerHTML = loading;

  const cfg = await api("config");
  destroyCharts();
  const root = el("div", {});

  root.appendChild(el("div", { class: "method-card", html: `
    <h3>Capa de IA</h3>
    <div class="kv-grid">
      <div class="kv"><div class="kv__label">Proveedor</div><div class="kv__value">Local (sentence-transformers)</div></div>
      <div class="kv"><div class="kv__label">Modelo de embeddings</div><div class="kv__value" style="font-size:.9rem">${cfg.embedding_model}</div></div>
      <div class="kv"><div class="kv__label">Dimensión</div><div class="kv__value">${cfg.embedding_dim}</div></div>
    </div>
    <p class="mt-2 muted" style="font-size:.8rem">Por defecto el sistema funciona 100% en local. Un proveedor comercial (OpenAI)
       puede activarse vía <code>.env</code> sin cambiar el resto del pipeline.</p>
  `}));

  root.appendChild(el("div", { class: "method-card", html: `
    <h3>Parámetros del III</h3>
    <div class="kv-grid">
      <div class="kv"><div class="kv__label">Peso Alineación</div><div class="kv__value">${fmt(cfg.iii.w_alineacion, 3)}</div></div>
      <div class="kv"><div class="kv__label">Peso Coincidencia</div><div class="kv__value">${fmt(cfg.iii.w_coincidencia, 3)}</div></div>
      <div class="kv"><div class="kv__label">Peso Temporalidad</div><div class="kv__value">${fmt(cfg.iii.w_temporalidad, 3)}</div></div>
      <div class="kv"><div class="kv__label">Ventana temporal</div><div class="kv__value">${cfg.iii.ventana_meses} meses</div></div>
    </div>
  `}));

  root.appendChild(el("div", { class: "method-card", html: `
    <h3>Parámetros del ICI</h3>
    <div class="kv-grid">
      <div class="kv"><div class="kv__label">α (peso político)</div><div class="kv__value">${fmt(cfg.ici.alpha_politico, 2)}</div></div>
      <div class="kv"><div class="kv__label">1−α (peso medios)</div><div class="kv__value">${fmt(cfg.ici.alpha_medios, 2)}</div></div>
      <div class="kv"><div class="kv__label">Canales políticos</div><div class="kv__value" style="font-size:.85rem">audiencias, citación, informe técnico</div></div>
      <div class="kv"><div class="kv__label">Canales medios</div><div class="kv__value" style="font-size:.85rem">menciones, espacio de opinión</div></div>
    </div>
  `}));

  root.appendChild(el("div", { class: "method-card", html: `
    <h3>Corpus</h3>
    <div class="kv-grid">
      <div class="kv"><div class="kv__label">Documentos procesados</div><div class="kv__value">${cfg.n_docs}</div></div>
      <div class="kv"><div class="kv__label">Formato</div><div class="kv__value">PDF → texto → propuestas → embeddings</div></div>
    </div>
    <p class="mt-2 muted" style="font-size:.8rem">El pipeline completo se ejecuta con <code>python -m src.pipeline</code>.
       Los artefactos se guardan en <code>data/processed/</code>.</p>
  `}));

  view().innerHTML = "";
  view().appendChild(root);
}

/* ═══════════════════════════════════════════════════════════════
   Componentes reutilizables
   ═══════════════════════════════════════════════════════════════ */
function kpiCard(label, value, delta, real, tag) {
  const tagBadge = tag === "mock"
    ? `<span class="badge badge--mock" style="margin-left:.4rem">ejemplo</span>`
    : (real ? `<span class="badge badge--real" style="margin-left:.4rem">real</span>` : "");
  return el("div", { class: "kpi-card" },
    el("div", { class: "kpi-card__label", html: label + tagBadge }),
    el("div", { class: "kpi-card__value", html: value }),
    el("div", { html: delta }),
  );
}

function chartCard(title, subtitle, bodyHtml, tall, tag) {
  const tagBadge = tag === "mock"
    ? `<span class="badge badge--mock">datos de ejemplo</span>`
    : (tag === "real" ? `<span class="badge badge--real">datos reales</span>` : "");
  return el("div", { class: "chart-card" },
    el("div", { class: "chart-card__head" },
      el("div", {},
        el("div", { class: "chart-card__title" }, title),
        el("div", { class: "chart-card__subtitle" }, subtitle)),
      el("div", { html: tagBadge })),
    el("div", { class: `chart-card__body ${tall ? "tall" : ""}`, html: bodyHtml }),
  );
}

function tableCard(title, subtitle, tag, headers, rows) {
  const tagBadge = tag === "mock"
    ? `<span class="badge badge--mock">datos de ejemplo</span>`
    : `<span class="badge badge--real">datos reales</span>`;
  const head = el("div", { class: "table-head" },
    el("div", {},
      el("div", { class: "table-head__title" }, title),
      el("div", { class: "muted", style: "font-size:.75rem" }, subtitle)),
    el("div", { html: tagBadge }));

  const table = el("table", { class: "data-table" });
  const thead = el("thead", {});
  const htr = el("tr", {});
  headers.forEach((h) => htr.appendChild(el("th", {}, h)));
  thead.appendChild(htr);
  table.appendChild(thead);

  const tbody = el("tbody", {});
  rows.forEach((r) => {
    const tr = el("tr", {});
    r.forEach((c) => tr.appendChild(c));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  return el("div", { class: "table-wrap" }, head, el("div", { class: "table-scroll" }, table));
}

function adopcionBadge(a) {
  const cls = a === "Total" ? "badge--total" : "badge--parcial";
  return el("span", { class: `badge ${cls}` }, a);
}

function progressBar(v, color = "primary") {
  const colorMap = { primary: "#2e4a62", amber: "#d4953a", teal: "#3a8b8c" };
  return el("div", { class: "bar", style: "min-width:80px" },
    el("div", { class: "bar__fill", style: `width:${Math.min(100, v * 100)}%;background:${colorMap[color] || colorMap.primary}` }));
}

/* ── Helpers de Chart.js ──────────────────────────────────────── */
function lineOpts(o = {}) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: "top", align: "end" },
      tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${o.yFmt ? o.yFmt(c.parsed.y) : c.parsed.y}` } } },
    scales: {
      x: { grid: { display: false } },
      y: o.yMin != null ? { min: o.yMin, max: o.yMax, ticks: { callback: (v) => o.yFmt(v) }, grid: { color: "#f0f1f4" } }
                     : { ticks: { callback: (v) => o.yFmt(v) }, grid: { color: "#f0f1f4" } },
    },
  };
}

function lineDs(label, data, color) {
  return { label, data, borderColor: color, backgroundColor: hexA(color, 0.08),
    fill: false, tension: 0.35, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: color };
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/* ═══════════════════════════════════════════════════════════════
   Router
   ═══════════════════════════════════════════════════════════════ */
const routes = {
  dashboard: viewDashboard,
  analisis: viewAnalisis,
  canales: viewCanales,
  auditoria: viewAuditoria,
  config: viewConfig,
};

async function navigate(route) {
  document.querySelectorAll(".nav-item").forEach((b) => {
    b.classList.toggle("active", b.dataset.route === route);
  });
  view().innerHTML = loading;
  try {
    await routes[route]();
  } catch (err) {
    console.error(err);
    destroyCharts();
    view().innerHTML = `<div class="error-msg">Error al cargar la vista: ${err.message}<br><br>¿Está el backend corriendo en <code>http://localhost:5000</code>?</div>`;
  }
}

document.getElementById("nav").addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-item");
  if (!btn) return;
  const route = btn.dataset.route;
  location.hash = route;
  navigate(route);
});

window.addEventListener("hashchange", () => {
  const route = location.hash.slice(1) || "dashboard";
  navigate(route);
});

/* Arranque */
const initial = location.hash.slice(1) || "dashboard";
navigate(initial);
