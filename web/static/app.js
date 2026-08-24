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

  const [ov, topics, dist, matches] = await Promise.all([
    api("overview"), api("topics"), api("influence-distribution"), api("recent-matches"),
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

  /* ── Fila 1: Temáticas (barras, 2/3) + Distribución donut (1/3) ── */
  const row1 = el("div", { class: "charts-grid" });
  row1.appendChild(chartCard(
    "Impacto por Temática", "III medio por área temática (real)",
    `<canvas id="ch-topics"></canvas>`, true, "real"));
  row1.appendChild(chartCard(
    "Distribución de Influencia", `Canales político vs. mediático · ${ov.n_interacciones} interacciones`,
    `<canvas id="ch-dist"></canvas>`, false, "mock"));
  root.appendChild(row1);

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
      scales: { x: { ticks: { callback: (v) => pct(v, 0) } }, y: { ticks: { font: { size: 11 } } } },
    },
  }));
}

/* ═══════════════════════════════════════════════════════════════
   VISTA: ANÁLISIS  (ranking + heatmap — datos reales)
   ═══════════════════════════════════════════════════════════════ */
async function viewAnalisis() {
  titleEl().textContent = "Análisis de Impacto de Ideas";
  view().innerHTML = loading;

  const [ranking, pairs, topics, policies, mAli, mCoin, mTemp] = await Promise.all([
    api("ranking"), api("pairs"), api("topics"), api("recent-matches"),
    api("matrix/alineacion"), api("matrix/coincidencia"), api("matrix/temporalidad"),
  ]);
  destroyCharts();

  /* Temática por documento (heurística del generador sobre datos reales). */
  const temaOf = {};
  topics.topics.forEach((t) => t.doc_ids.forEach((d) => { temaOf[d] = t.tema; }));

  /* Componentes medios por documento: media de su fila como fuente, sin diagonal. */
  const rowMean = (m, docId) => {
    const i = m.doc_ids.indexOf(docId);
    if (i < 0) return 0;
    const row = m.matrix[i];
    let s = 0;
    for (let j = 0; j < row.length; j++) if (j !== i) s += row[j];
    return s / (row.length - 1);
  };
  const inWindow = (m, docId) => {
    const i = m.doc_ids.indexOf(docId);
    if (i < 0) return 0;
    return m.matrix[i].filter((v, j) => j !== i && v > 0).length;
  };

  /* Umbrales por terciles del corpus (la escala del III es relativa al corpus). */
  const sortedScores = ranking.map((d) => d.iii_medio).sort((a, b) => a - b);
  const qtile = (p) => sortedScores[Math.min(sortedScores.length - 1, Math.floor(p * (sortedScores.length - 1)))];
  const umbralAlto = qtile(2 / 3);
  const umbralBajo = qtile(1 / 3);
  const scoreColor = (s) => s >= umbralAlto ? C.secondary : s >= umbralBajo ? C.amber : C.terra;

  /* Políticas vinculadas (mock) por publicación. */
  const polOf = {};
  policies.policies.forEach((p) => { (polOf[p.publicacion] = polOf[p.publicacion] || []).push(p); });

  let selected = ranking[0];
  let filter = "todos";
  let search = "";
  let detailToken = 0;

  const root = el("div", {},
    el("p", { class: "muted md-subtitle" },
      "Evaluación de alineación semántica entre las publicaciones de la ACA · componentes del III calculados sobre el corpus real"));

  /* ── Filtros: búsqueda + segmento de nivel de impacto ── */
  const searchInput = el("input", { class: "input md-search", type: "text", placeholder: "Buscar publicaciones..." });
  searchInput.addEventListener("input", () => { search = searchInput.value; renderList(); });
  const segBtns = [["todos", "Todos"], ["alto", "Alto Impacto"], ["medio", "Impacto Medio"], ["bajo", "Bajo Impacto"]]
    .map(([key, label]) => {
      const b = el("button", { class: "seg__btn", type: "button", "data-key": key }, label);
      b.addEventListener("click", () => {
        filter = key;
        segBtns.forEach((x) => x.classList.toggle("active", x.dataset.key === key));
        renderList();
      });
      return b;
    });
  segBtns[0].classList.add("active");
  root.appendChild(el("div", { class: "md-filters" },
    el("div", { class: "md-search-wrap" }, searchInput),
    el("div", { class: "seg" }, ...segBtns)));

  /* ── Master-detail ── */
  const listHead = el("h3", { html: `Publicaciones (<span class="muted">${ranking.length}</span>)` });
  const listBody = el("div", { class: "md-list__scroll" });
  const detail = el("div", { class: "md-detail" });
  root.appendChild(el("div", { class: "md-grid" },
    el("div", { class: "md-card md-list" },
      el("div", { class: "md-list__head" }, listHead), listBody),
    detail));

  function renderList() {
    const q = search.trim().toLowerCase();
    const items = ranking.filter((d) => {
      if (q && !(d.filename.toLowerCase().includes(q) || d.doc_id.toLowerCase().includes(q))) return false;
      if (filter === "alto") return d.iii_medio >= umbralAlto;
      if (filter === "medio") return d.iii_medio >= umbralBajo && d.iii_medio < umbralAlto;
      if (filter === "bajo") return d.iii_medio < umbralBajo;
      return true;
    });
    listHead.innerHTML = `Publicaciones (<span class="muted">${items.length}</span>)`;
    listBody.innerHTML = "";
    if (!items.length) {
      listBody.appendChild(el("div", { class: "md-empty" },
        el("p", { class: "md-empty__title" }, "Sin resultados"),
        el("p", { class: "muted", style: "font-size:.8rem" }, "Ninguna publicación coincide con la búsqueda o el filtro")));
      return;
    }
    items.forEach((d) => {
      const item = el("button", {
        class: `md-item${d.doc_id === selected.doc_id ? " selected" : ""}`,
        type: "button",
        title: d.filename,
      },
        el("h4", { class: "md-item__title" }, shortName(d.filename, 70)),
        el("div", { class: "md-item__meta" },
          el("span", { class: "muted" }, `${fmtDate(d.fecha)} · ${temaOf[d.doc_id] || "Otros"}`),
          el("span", { class: "md-item__score", style: `color:${scoreColor(d.iii_medio)}` }, pct(d.iii_medio, 0))));
      item.addEventListener("click", () => {
        if (selected.doc_id === d.doc_id) return;
        selected = d;
        renderList();
        renderDetail();
      });
      listBody.appendChild(item);
    });
  }

  async function renderDetail() {
    const d = selected;
    const token = ++detailToken;
    detail.innerHTML = loading;
    const props = await api(`proposals/${encodeURIComponent(d.doc_id)}`);
    if (token !== detailToken) return;  // el usuario ya seleccionó otra publicación
    let plink = null;
    try {
      plink = await api(`policy-link/${encodeURIComponent(d.doc_id)}`);
    } catch { /* sin vínculo político todavía */ }

    const n = ranking.length;
    const ali = rowMean(mAli, d.doc_id);
    const coin = rowMean(mCoin, d.doc_id);
    const temp = rowMean(mTemp, d.doc_id);
    const nPos = inWindow(mTemp, d.doc_id);

    const metric = (label, value, color, right) =>
      el("div", { class: "metric" },
        el("div", { class: "metric__head" },
          el("span", {}, label),
          el("span", { class: "metric__val", style: `color:${color}` }, right)),
        el("div", { class: "bar", style: "min-width:0" },
          el("div", { class: "bar__fill", style: `width:${Math.min(100, value * 100)}%;background:${color}` })));

    /* Revisión manual: dropdown para comparar cada propuesta contra el PDF. */
    const revCard = (() => {
      const card = el("div", { class: "md-card" },
        el("h3", { class: "md-card__h" }, "Revisión de propuestas ",
          el("span", { class: "badge badge--real" }, "real")));
      if (!props.propuestas.length) {
        card.appendChild(el("p", { class: "muted" },
          "Este documento no tiene propuestas extraídas."));
        return card;
      }
      const pList = props.propuestas;
      const nLit = pList.filter((p) => p.estado === "literal").length;
      card.appendChild(el("p", { class: "muted rev__summary" },
        `${nLit} de ${props.total} propuestas son texto literal del documento ` +
        `(verificación automática) — revisa y dime cuáles están mal`));
      const sel = el("select", { class: "rev__select" });
      pList.forEach((p, i) => {
        sel.appendChild(el("option", { value: String(i) },
          `${String(i + 1).padStart(2, "0")} · ${p.text.slice(0, 72)}${p.text.length > 72 ? "…" : ""}`));
      });
      const box = el("div", { class: "rev__box" });
      const count = el("span", { class: "muted rev__count" });
      const prev = el("button", { class: "icon-btn", type: "button", title: "Anterior" }, "←");
      const next = el("button", { class: "icon-btn", type: "button", title: "Siguiente" }, "→");
      const show = (i) => {
        const p = pList[i];
        sel.value = String(i);
        count.textContent = `propuesta ${i + 1} de ${pList.length}`;
        box.innerHTML = "";
        box.appendChild(el("p", { class: "rev__text" }, p.text));
        if (p.estado === "literal") {
          box.appendChild(el("p", { class: "rev__verif rev__verif--ok" },
            "✓ verificada: aparece literalmente en el documento"));
          if (p.evidencia && p.evidencia.trim() !== p.text.trim())
            box.appendChild(el("p", { class: "rev__verif" },
              `En el documento: «${p.evidencia}»`));
        } else {
          box.appendChild(el("p", { class: "rev__verif rev__verif--bad" },
            "✗ no verificada: no se encontró este texto en el documento (posible paráfrasis generada) — ayúdame a revisarla"));
        }
      };
      sel.addEventListener("change", () => show(parseInt(sel.value, 10)));
      prev.addEventListener("click", () =>
        show(Math.max(0, parseInt(sel.value, 10) - 1)));
      next.addEventListener("click", () =>
        show(Math.min(pList.length - 1, parseInt(sel.value, 10) + 1)));
      card.appendChild(el("label", { class: "rev__label" }, "Selecciona una propuesta"));
      card.appendChild(sel);
      card.appendChild(el("div", { class: "rev__nav" }, prev, count, next));
      card.appendChild(box);
      card.appendChild(el("a",
        { class: "rev__pdf", href: `pdf/${encodeURIComponent(d.filename)}`, target: "_blank" },
        "Abrir el PDF original ↗"));
      show(0);
      return card;
    })();

    /* Coincidencia REAL con política (piloto NDC). */
    const policyCard = plink ? el("div", { class: "md-card" },
      el("h3", { class: "md-card__h" }, "Coincidencia de Política ",
        el("span", { class: "badge badge--real" }, "real")),
      el("div", { class: "policy-item" },
        el("p", { class: "policy-item__name" }, plink.nombre || plink.politica),
        el("p", { class: "muted policy-item__meta" },
          `${plink.institucion} · ${plink.tipo} · ${fmtDate(plink.fecha)}`)),
      metric("Alineación temática (escala del corpus)", plink.alineacion, C.primary, pct(plink.alineacion, 0)),
      metric("Coincidencia de propuestas", plink.coincidencia, C.teal, pct(plink.coincidencia, 0)),
      metric("Temporalidad (36 meses)", plink.temporalidad, C.secondary,
        plink.temporalidad === 0 ? "fuera de ventana" : `${plink.meses} meses`),
      el("div", { class: "score-final" },
        el("div", { class: "score-final__row" },
          el("span", {}, "III publicación × política"),
          el("span", { class: "score-final__value" }, pct(plink.iii, 1))),
        el("p", { class: "muted score-final__note" },
          "Alineación y coincidencia reescaladas con los extremos empíricos del " +
          "corpus de publicaciones (v1.1); temporalidad asimétrica.")),
      ...(plink.evidencia && plink.evidencia.length ? [el("div", { class: "evidence" },
        el("p", { class: "evidence__label" }, "Evidencia textual (real)"),
        ...plink.evidencia.slice(0, 2).map((e) => el("div", { style: "margin:.55rem 0" },
          el("p", { class: "evidence__text" }, `ACA: «${e.aca}»`),
          el("p", { class: "evidence__text" }, `Política: «${e.politica}»`),
          el("p", { class: "muted", style: "font-size:.72rem;margin:.15rem 0 0" },
            `coincidencia semántica ${e.cos}`))))] : []))
      : null;

    /* Ficha de la publicación (datos reales). */
    const cards = [
      el("div", { class: "md-card" },
        el("span", { class: "chip" }, temaOf[d.doc_id] || "Otros"),
        el("h2", { class: "md-title", title: d.filename }, shortName(d.filename, 90)),
        el("p", { class: "muted md-meta" }, `${fmtDate(d.fecha)} · ${d.n_pages} páginas · ${d.n_propuestas} propuestas extraídas`),
        el("div", { class: "md-excerpt" },
          el("p", { class: "md-excerpt__label" }, "Primera propuesta extraída (real)"),
          el("p", { class: "md-excerpt__text" }, props.propuestas[0].text || "—"))),

      /* Desglose del III (componentes reales por documento). */
      el("div", { class: "md-card" },
        el("h3", { class: "md-card__h" }, "Desglose del III ", el("span", { class: "badge badge--real" }, "real")),
        metric("Alineación temática", ali, C.primary, pct(ali, 0)),
        metric("Coincidencia de propuestas", coin, C.teal, pct(coin, 0)),
        metric("Temporalidad (como fuente)", temp, C.secondary, `${nPos}/${n - 1} en ventana`),
        el("div", { class: "score-final" },
          el("div", { class: "score-final__row" },
            el("span", {}, "III medio (como fuente)"),
            el("span", { class: "score-final__value" }, pct(d.iii_medio, 1))),
          el("p", { class: "muted score-final__note" },
            `Potencial de influencia sobre las otras ${n - 1} publicaciones del corpus: ` +
            `${nPos} blancos posteriores caen dentro de la ventana de 36 meses. ` +
            "Cada componente es la media de su fila en la matriz correspondiente."))),

      revCard,

      ...(policyCard ? [policyCard] : []),
    ];

    /* Coincidencias de política (mock, con su badge). */
    const linked = polOf[d.doc_id] || [];
    if (linked.length) {
      linked.forEach((p) => {
        cards.push(el("div", { class: "md-card" },
          el("h3", { class: "md-card__h" }, "Otras coincidencias ",
            el("span", { class: "badge badge--mock" }, "ejemplo")),
          el("div", { class: "policy-item" },
            el("p", { class: "policy-item__name" }, p.politica),
            el("p", { class: "muted policy-item__meta" }, `${p.institucion} · ${p.n_ley} · ${fmtDate(p.fecha)}`)),
          el("div", { class: "metric__head", style: "margin-top:.6rem" },
            el("span", { class: "metric__val", style: `color:${scoreColor(p.iii)}` }, pct(p.iii, 1)),
            adopcionBadge(p.adopcion))));
      });
    } else {
      cards.push(el("div", { class: "md-card md-card--empty" },
        el("p", { class: "md-empty__title" }, "Sin coincidencias registradas"),
        el("p", { class: "muted", style: "font-size:.8rem" },
          "Esta publicación aún no tiene políticas vinculadas (datos de política pendientes de recolectar)")));
    }

    detail.innerHTML = "";
    cards.forEach((c) => detail.appendChild(c));
  }

  /* ── Heatmap ── */
  root.appendChild(chartCard(
    "Matriz de Similitud III", `Heatmap publicación-publicación (${ranking.length}×${ranking.length}) · datos reales`,
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

  view().innerHTML = "";
  view().appendChild(root);

  /* ── Render inicial del master-detail y del heatmap ── */
  renderList();
  renderDetail();
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
    Object.entries(channelCounts).filter(([tipo]) => tipo !== "_max").map(([tipo, info]) => [
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

  const [cfg, ov] = await Promise.all([api("config"), api("overview")]);
  destroyCharts();
  const root = el("div", {});

  root.appendChild(el("div", { class: "method-card", html: `
    <h3>Metodología del III — Índice de Impacto de Ideas</h3>
    <p>El III mide el <strong>potencial de influencia</strong> de una publicación sobre otra,
       combinando tres componentes normalizados en [0, 1]:</p>
    <div class="formula">III(f, b) = ⅓·Alineación(f,b) + ⅓·Coincidencia(f,b) + ⅓·Temporalidad(f,b)</div>
    <h4>Alineación temática</h4>
    <div class="formula">Alineación(f,b) = reescalado_empírico( cos(emb(f), emb(b)) )</div>
    <p>Similitud coseno entre embeddings del documento fuente y blanco. El embedding de cada documento es el
       promedio de embeddings de fragmentos muestreados a lo largo de todo el texto (no solo el inicio).
       El reescalado empírico (min-max sobre los pares del corpus) evita la compresión del antiguo (cos+1)/2:
       1 = par más alineado del corpus, 0 = menos alineado.
       Modelo: <code>${cfg.embedding_model}</code> (${cfg.embedding_dim} dim).</p>
    <h4>Coincidencia de propuestas</h4>
    <div class="formula">Coincidencia = reescalado_empírico( media_i [ max_j cos(p_i, q_j) ] )</div>
    <p>Para cada propuesta del documento fuente, se toma su mejor coincidencia en el documento blanco,
       y se promedian todas con el mismo reescalado empírico.</p>
    <h4>Temporalidad</h4>
    <div class="formula">Temporalidad = 0 si t_b &lt; t_f; &nbsp; si no, max(0, 1 − Δmeses / ${cfg.iii.ventana_meses})</div>
    <p>Decaimiento lineal dentro de una ventana de ${cfg.iii.ventana_meses} meses.
       <strong>Asimétrica</strong>: si el blanco es anterior a la fuente, la temporalidad es 0
       (la influencia hacia el pasado es causalmente imposible).</p>
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
      <div class="kv"><div class="kv__label"><span class="badge badge--real">Real</span></div><div class="kv__value">${ov.n_publicaciones} publicaciones</div><div class="muted" style="font-size:.78rem">PDFs procesados con el pipeline</div></div>
      <div class="kv"><div class="kv__label"><span class="badge badge--real">Real</span></div><div class="kv__value">${ov.n_propuestas} propuestas</div><div class="muted" style="font-size:.78rem">extraídas con LLM (Haiku 4.5)</div></div>
      <div class="kv"><div class="kv__label"><span class="badge badge--real">Real</span></div><div class="kv__value">Matriz III ${ov.n_publicaciones}×${ov.n_publicaciones}</div><div class="muted" style="font-size:.78rem">3 componentes calculados</div></div>
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
      <div class="kv"><div class="kv__label">Temporalidad asimétrica</div><div class="kv__value">${cfg.iii.temporalidad_asimetrica ? "Sí (blanco anterior ⇒ 0)" : "No"}</div></div>
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
  titleEl().textContent = "Configuración";
  view().innerHTML = loading;

  const [cfg, topics, cat] = await Promise.all([
    api("config"), api("topics"), api("catalogos"),
  ]);
  destroyCharts();
  const root = el("div", {});
  root.appendChild(el("p", { class: "muted md-subtitle" },
    "Gestión de fuentes de datos, parámetros del sistema y catálogos"));

  const ICONS = {
    save: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
    plus: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    pencil: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
    trash: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  };

  const kv = (label, value, small) => el("div", { class: "kv" },
    el("div", { class: "kv__label" }, label),
    el("div", { class: "kv__value", style: small ? "font-size:.9rem" : "" }, value));

  const iconBtns = () => [
    el("span", { class: "icon-btn", title: "Editar" , html: ICONS.pencil }),
    el("span", { class: "icon-btn icon-btn--danger", title: "Eliminar", html: ICONS.trash }),
  ];

  function cfgTable(headers, rows) {
    const table = el("table", { class: "data-table data-table--actions" });
    const thead = el("thead", {});
    const htr = el("tr", {});
    headers.forEach((h) => htr.appendChild(el("th", {}, h)));
    thead.appendChild(htr);
    table.appendChild(thead);
    const tbody = el("tbody", {});
    rows.forEach((r) => {
      const tr = el("tr", {});
      r.forEach((c) => tr.appendChild(el("td", {}, c)));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    return el("div", { class: "table-scroll" }, table);
  }

  function numInput(label, value, help, step) {
    return el("div", {},
      el("label", { class: "cfg-label" }, label),
      el("input", { class: "input", type: "number", step: step || "1", value: String(value) }),
      el("p", { class: "cfg-help" }, help));
  }

  const content = el("div", { class: "cfg-content" });
  const tabs = [["general", "General"], ["autores", "Autores"], ["temas", "Temas"], ["instituciones", "Instituciones"]];
  const tabBtns = tabs.map(([key, label]) => {
    const b = el("button", { class: "cfg-tab", type: "button" }, label);
    b.addEventListener("click", () => {
      tabBtns.forEach((x) => x.classList.toggle("active", x === b));
      renderTab(key);
    });
    return b;
  });
  tabBtns[0].classList.add("active");
  root.appendChild(el("div", { class: "cfg-grid" },
    el("div", { class: "cfg-tabs" }, ...tabBtns), content));

  function renderTab(key) {
    content.innerHTML = "";

    if (key === "general") {
      /* ── Parámetros del III (valores reales activos) ── */
      content.appendChild(el("div", { class: "md-card" },
        el("h3", { class: "md-card__h" }, "Parámetros del III ",
          el("span", { class: "badge badge--real" }, "real")),
        el("p", { class: "cfg-note", style: "margin:-0.6rem 0 1.1rem" },
          "Ponderación del Índice de Impacto de Ideas — valores activos en el corpus"),
        el("div", { class: "cfg-inputs" },
          numInput("Ventana temporal (meses)", cfg.iii.ventana_meses, "Decaimiento lineal dentro de la ventana"),
          numInput("Peso Alineación", fmt(cfg.iii.w_alineacion, 3), "Similitud temática (reescalado empírico)", "0.001"),
          numInput("Peso Coincidencia", fmt(cfg.iii.w_coincidencia, 3), "Solapamiento de propuestas", "0.001"),
          numInput("Peso Temporalidad", fmt(cfg.iii.w_temporalidad, 3), "Cercanía temporal (asimétrica)", "0.001")),
        el("div", { class: "logic-box" },
          el("p", {}, el("strong", {}, "Lógica actual:")),
          el("ul", { html:
            `<li>Blanco anterior a la fuente ⇒ temporalidad 0 (asimetría causal)</li>
             <li>Δ ≤ ${cfg.iii.ventana_meses} meses ⇒ temporalidad = 1 − Δ/${cfg.iii.ventana_meses}</li>
             <li>III = ⅓·Alineación + ⅓·Coincidencia + ⅓·Temporalidad, con reescalado empírico por corpus</li>` })),
        el("div", { class: "cfg-actions" },
          el("span", { class: "cfg-note", id: "cfg-save-note" }, ""),
          el("button", { class: "btn-primary", type: "button", html: ICONS.save + " Guardar Cambios" }))));
      content.querySelector(".btn-primary").addEventListener("click", () => {
        content.querySelector("#cfg-save-note").textContent =
          "Los parámetros se definen en src/config.py y se aplican al re-ejecutar el pipeline (python -m src.pipeline).";
      });

      /* ── Fuentes de Datos: la real activa + el plan de recolección ICI ── */
      const fuentes = [
        { name: "Publicaciones ACA", desc: `${cat.n_docs} PDFs del corpus, procesados por el pipeline`, on: true, real: true },
        { name: "Asamblea Legislativa", desc: "Actas, expedientes y transcripciones (plan ICI)", on: false },
        { name: "La Gaceta", desc: "Decretos, leyes y normas (plan ICI)", on: false },
        { name: "Medios y hemerotecas", desc: "Menciones y espacios de opinión (plan ICI)", on: false },
        { name: "Informes técnicos oficiales", desc: "BCCR, Hacienda, CGR, ministerios (plan ICI)", on: false },
      ];
      const fuentesCard = el("div", { class: "md-card" },
        el("h3", { class: "md-card__h" }, "Fuentes de Datos"),
        el("p", { class: "cfg-note", style: "margin:-0.6rem 0 .4rem" },
          "Estado y plan de ingesta: las fuentes pendientes se habilitan al completar la recolección (metodología §3.4)"));
      fuentes.forEach((f) => {
        const sw = el("button", { class: `switch${f.on ? " on" : ""}`, type: "button", "aria-label": `Activar ${f.name}` });
        sw.addEventListener("click", () => sw.classList.toggle("on"));
        fuentesCard.appendChild(el("div", { class: "source-row" },
          el("div", {},
            el("p", { class: "source-name" }, f.name,
              f.real ? el("span", { class: "badge badge--real", style: "margin-left:.5rem" }, "real") : null),
            el("p", { class: "cfg-help", style: "margin:.1rem 0 0" }, f.desc)),
          sw));
      });
      content.appendChild(fuentesCard);

      /* ── Capa de IA y Corpus ── */
      content.appendChild(el("div", { class: "md-card" },
        el("h3", { class: "md-card__h" }, "Capa de IA y Corpus ",
          el("span", { class: "badge badge--real" }, "real")),
        el("div", { class: "kv-grid" },
          kv("Proveedor", "Local (sentence-transformers)"),
          kv("Modelo de embeddings", cfg.embedding_model, true),
          kv("Dimensión", String(cfg.embedding_dim)),
          kv("Documentos procesados", String(cfg.n_docs)),
          kv("Artefactos", "data/processed/", true),
          kv("Pipeline", "python -m src.pipeline", true))));
    }

    if (key === "autores") {
      const rows = cat.autores.map((a) => [
        el("span", {}, a.nombre),
        el("span", { class: "num muted" }, String(a.n_docs)),
        el("span", {}, ...iconBtns()),
      ]);
      content.appendChild(el("div", { class: "md-card" },
        el("div", { class: "flex-between", style: "margin-bottom:1rem" },
          el("h3", { class: "md-card__h", style: "margin:0" }, `Autores (${cat.autores.length}) `,
            el("span", { class: "badge badge--real" }, "real")),
          el("button", { class: "btn-primary", type: "button", html: ICONS.plus + " Agregar" })),
        cfgTable(["Nombre", "Publicaciones", "Acciones"], rows),
        el("p", { class: "cfg-note", style: "margin-top:.9rem" },
          `${cat.n_docs_sin_autor} de ${cat.n_docs} publicaciones no declaran autor en los metadatos del PDF; la extracción desde portadas está pendiente.`)));
    }

    if (key === "temas") {
      const rows = topics.topics.map((t) => [
        el("span", {}, t.tema),
        el("span", { class: "num muted" }, `${t.n_docs} publicaciones · III ${t.iii_pct}%`),
        el("span", {}, ...iconBtns()),
      ]);
      content.appendChild(el("div", { class: "md-card" },
        el("div", { class: "flex-between", style: "margin-bottom:1rem" },
          el("h3", { class: "md-card__h", style: "margin:0" }, `Temas de Investigación (${topics.topics.length}) `,
            el("span", { class: "badge badge--real" }, "real")),
          el("button", { class: "btn-primary", type: "button", html: ICONS.plus + " Agregar" })),
        cfgTable(["Tema", "Publicaciones", "Acciones"], rows),
        el("p", { class: "cfg-note", style: "margin-top:.9rem" },
          "Asignación heurística por palabras clave sobre el nombre de archivo; revisable manualmente.")));
    }

    if (key === "instituciones") {
      const rows = cat.instituciones.map((i) => [
        el("span", {}, i.nombre),
        el("span", { class: "badge badge--sector" }, i.sector),
        el("span", {}, ...iconBtns()),
      ]);
      content.appendChild(el("div", { class: "md-card" },
        el("div", { class: "flex-between", style: "margin-bottom:1rem" },
          el("h3", { class: "md-card__h", style: "margin:0" }, `Instituciones (${cat.instituciones.length})`),
          el("button", { class: "btn-primary", type: "button", html: ICONS.plus + " Agregar" })),
        cfgTable(["Nombre", "Sector", "Acciones"], rows),
        el("p", { class: "cfg-note", style: "margin-top:.9rem" },
          "Catálogo de monitoreo del plan de recolección ICI (metodología §3.4).")));
    }
  }

  renderTab("general");

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
    r.forEach((c) => tr.appendChild(el("td", {}, c)));
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
  configuracion: viewConfig,  // alias: URL directa #configuracion
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
