const pptxgen = require("pptxgenjs");

const P = new pptxgen();
P.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
P.author = "Academia de Centroamérica";
P.title = "Del papel a la política pública — Sistema de Inteligencia ACA";

// Paleta (heredada de la plataforma web del sistema)
const DARK = "22384D", DARK2 = "2C4A63", TEAL = "3A8B8C", GREEN = "1E7A5F",
  AMBER = "D4953A", TEXT = "1A1D23", MUTED = "5C6370", CARD = "F4F6F5",
  LINE = "E3E7EA", WHITE = "FFFFFF", SOFT_T = "EAF4F4", SOFT_G = "E9F4F0",
  SOFT_A = "FBF3E6", ICE = "C9DAE4";
const H = "Cambria", B = "Calibri";
const W = 13.33, HH = 7.5;
const shadow = () => ({ type: "outer", color: "1A2B3C", blur: 7, offset: 2, angle: 45, opacity: 0.18 });
const bu = () => ({ code: "25B8", indent: 12 });

const header = (s, kicker, title, dark = false) => {
  s.addText(kicker.toUpperCase(), { x: 0.55, y: 0.32, w: 12, h: 0.3, fontFace: B, fontSize: 11, bold: true, charSpacing: 3, color: dark ? ICE : TEAL, margin: 0 });
  s.addText(title, { x: 0.55, y: 0.58, w: 12.2, h: 0.75, fontFace: H, fontSize: 30, bold: true, color: dark ? WHITE : TEXT, margin: 0 });
};
const numDot = (s, x, y, n, color, d = 0.42) => {
  s.addShape(P.shapes.OVAL, { x, y, w: d, h: d, fill: { color } });
  s.addText(String(n), { x, y: y - 0.02, w: d, h: d, align: "center", valign: "middle", fontFace: B, fontSize: 15, bold: true, color: WHITE, margin: 0 });
};

/* ── 1 · Portada (oscura) ─────────────────────────────────────── */
let s = P.addSlide();
s.background = { color: DARK };
s.addShape(P.shapes.OVAL, { x: 9.9, y: -2.3, w: 6.5, h: 6.5, fill: { color: DARK2, transparency: 40 } });
s.addShape(P.shapes.OVAL, { x: 11.2, y: 5.6, w: 3.6, h: 3.6, fill: { color: TEAL, transparency: 72 } });
s.addText("ACADEMIA DE CENTROAMÉRICA", { x: 0.9, y: 1.5, w: 11, h: 0.4, fontFace: B, fontSize: 13, bold: true, charSpacing: 4, color: ICE, margin: 0 });
s.addText("Del papel a la\npolítica pública", { x: 0.9, y: 2.0, w: 11.5, h: 2.3, fontFace: H, fontSize: 54, bold: true, color: WHITE, margin: 0, lineSpacing: 62 });
s.addText("Sistema de Inteligencia para medir el impacto de las ideas de ACA\nen las leyes, decretos y estrategias del país", { x: 0.9, y: 4.45, w: 10.5, h: 0.95, fontFace: B, fontSize: 18, color: ICE, margin: 0, lineSpacing: 26 });
s.addShape(P.shapes.LINE, { x: 0.95, y: 5.75, w: 2.2, h: 0, line: { color: TEAL, width: 2.5 } });
s.addText("Presentación a la Junta Directiva · 2026", { x: 0.9, y: 5.95, w: 9, h: 0.4, fontFace: B, fontSize: 14, color: ICE, margin: 0 });
s.addNotes("Bienvenida. Hoy les muestro un sistema que ya está corriendo y que responde una pregunta que ACA se ha hecho por décadas: ¿nuestras ideas llegan a la política pública? 12 láminas, 12 minutos, y al final un demo en vivo si el tiempo lo permite.");

/* ── 2 · El problema ──────────────────────────────────────────── */
s = P.addSlide(); s.background = { color: WHITE };
header(s, "El problema", "Influir no basta: hay que poder demostrarlo");
const probs = [
  ["Influencia contada con anécdotas", "Cuando ACA aporta a una política, la historia sobrevive en conversaciones y correos — no en evidencia."],
  ["Nadie conecta publicación → política", "No existe un seguimiento sistemático entre lo que publicamos y lo que el Estado decide después."],
  ["Sin evidencia, el valor se subestima", "Ante juntas, financiadores y socios, el impacto de ACA queda en palabras cuando podría estar en datos."],
];
probs.forEach(([t, d], i) => {
  const y = 1.75 + i * 1.62;
  numDot(s, 0.55, y, i + 1, TEAL);
  s.addText(t, { x: 1.15, y: y - 0.08, w: 6.2, h: 0.45, fontFace: B, fontSize: 17, bold: true, color: TEXT, margin: 0 });
  s.addText(d, { x: 1.15, y: y + 0.36, w: 6.3, h: 0.95, fontFace: B, fontSize: 13.5, color: MUTED, margin: 0, lineSpacing: 18 });
});
s.addShape(P.shapes.ROUNDED_RECTANGLE, { x: 8.15, y: 1.9, w: 4.6, h: 4.4, fill: { color: DARK }, rectRadius: 0.12, shadow: shadow() });
s.addText("“", { x: 8.45, y: 2.0, w: 1, h: 0.9, fontFace: H, fontSize: 60, color: TEAL, margin: 0 });
s.addText("¿Nuestras recomendaciones aparecen en leyes, decretos y estrategias públicas?", { x: 8.5, y: 2.75, w: 3.95, h: 1.9, fontFace: H, fontSize: 20, italic: true, color: WHITE, margin: 0, lineSpacing: 28 });
s.addText("La pregunta que el sistema responde, publicación por publicación.", { x: 8.5, y: 5.15, w: 3.9, h: 0.85, fontFace: B, fontSize: 12.5, color: ICE, margin: 0 });
s.addNotes("Tres dolores reales: anécdotas, falta de seguimiento sistemático, y subestimación del valor. La cita de la derecha es la pregunta que guio todo el proyecto.");

/* ── 3 · La idea ──────────────────────────────────────────────── */
s = P.addSlide(); s.background = { color: WHITE };
header(s, "La idea", "Un termómetro de influencia: el Índice de Impacto de Ideas");
s.addText([
  { text: "Para cada publicación de ACA y cada política pública posterior, medimos ", options: {} },
  { text: "qué tan parecidos dicen lo mismo", options: { bold: true, color: TEAL } },
  { text: ", con una regla de oro: la política tiene que ser ", options: {} },
  { text: "posterior", options: { bold: true, color: TEAL } },
  { text: " a la publicación.", options: {} },
], { x: 0.55, y: 1.55, w: 12.2, h: 0.75, fontFace: B, fontSize: 16.5, color: TEXT, margin: 0, lineSpacing: 24 });
const comps = [
  ["1", "Tema parecido", "¿La política trata del mismo asunto que el estudio?", "Alineación", TEAL, SOFT_T],
  ["2", "Propuestas coincidentes", "¿Dice —con otras palabras— lo que ACA recomendó?", "Coincidencia", GREEN, SOFT_G],
  ["3", "Tiempo correcto", "¿La política se publicó después? Cuanto más cerca, más plausible la influencia.", "Temporalidad", AMBER, SOFT_A],
];
comps.forEach(([n, t, d, tag, c, soft], i) => {
  const x = 0.55 + i * 4.18;
  s.addShape(P.shapes.ROUNDED_RECTANGLE, { x, y: 2.55, w: 3.85, h: 3.35, fill: { color: soft }, rectRadius: 0.1 });
  numDot(s, x + 0.3, y = 2.9, n, c, 0.5);
  s.addText(t, { x: x + 0.3, y: 3.55, w: 3.3, h: 0.4, fontFace: B, fontSize: 17, bold: true, color: TEXT, margin: 0 });
  s.addText(d, { x: x + 0.3, y: 4.0, w: 3.3, h: 1.35, fontFace: B, fontSize: 13, color: MUTED, margin: 0, lineSpacing: 18 });
  s.addText(tag.toUpperCase(), { x: x + 0.3, y: 5.35, w: 3.2, h: 0.3, fontFace: B, fontSize: 10.5, bold: true, charSpacing: 2, color: c, margin: 0 });
});
s.addText("III  =  ⅓ Alineación  +  ⅓ Coincidencia  +  ⅓ Temporalidad", { x: 0.55, y: 6.35, w: 12.2, h: 0.5, align: "center", fontFace: H, fontSize: 17, italic: true, color: TEXT, margin: 0 });
s.addNotes("Sin tecnicismos: parecido en el tema, coincidencia en las propuestas, y tiempo correcto. La regla de oro — política posterior — evita atribuir influencia imposible hacia atrás.");

/* ── 4 · Cómo funciona ────────────────────────────────────────── */
s = P.addSlide(); s.background = { color: WHITE };
header(s, "Cómo funciona", "Tres pasos, sin intervención manual");
const steps = [
  ["LEEMOS", "24 estudios de ACA procesados: 1,554 páginas convertidas a texto legible por máquina.", TEAL],
  ["EXTRAEMOS", "677 recomendaciones, copiadas palabra por palabra. El 96% se verifica automáticamente contra el PDF original.", GREEN],
  ["COMPARAMOS", "Cada recomendación se contrasta con las políticas oficiales publicadas después, y el sistema entrega la evidencia textual.", AMBER],
];
steps.forEach(([t, d, c], i) => {
  const x = 0.55 + i * 4.35;
  s.addShape(P.shapes.ROUNDED_RECTANGLE, { x, y: 1.9, w: 3.9, h: 3.5, fill: { color: WHITE }, line: { color: LINE, width: 1 }, rectRadius: 0.1, shadow: shadow() });
  numDot(s, x + 0.35, 2.25, i + 1, c, 0.55);
  s.addText(t, { x: x + 0.35, y: 3.0, w: 3.2, h: 0.4, fontFace: B, fontSize: 17, bold: true, charSpacing: 2, color: c, margin: 0 });
  s.addText(d, { x: x + 0.35, y: 3.5, w: 3.25, h: 1.7, fontFace: B, fontSize: 13.5, color: TEXT, margin: 0, lineSpacing: 19 });
  if (i < 2) s.addText("→", { x: x + 3.92, y: 3.3, w: 0.45, h: 0.6, fontFace: B, fontSize: 26, bold: true, color: MUTED, align: "center", margin: 0 });
});
s.addText("Todo el procesamiento pesado se hace una sola vez; después, cada política nueva que entra al sistema se compara en minutos.", { x: 0.55, y: 5.85, w: 12.2, h: 0.6, align: "center", fontFace: B, fontSize: 13.5, italic: true, color: MUTED, margin: 0 });
s.addNotes("Leemos, extraemos con IA copiando palabra por palabra — y lo verificamos: si una frase no está en el PDF, el sistema la marca. Luego compara. Lo caro se paga una vez.");

/* ── 5 · Hoy: números ─────────────────────────────────────────── */
s = P.addSlide(); s.background = { color: WHITE };
header(s, "Lo que ya existe", "El sistema está construido — y corriendo");
const stats = [
  ["24", "estudios del corpus procesados de punta a punta", TEAL],
  ["677", "recomendaciones extraídas y catalogadas", GREEN],
  ["96%", "verificadas palabra por palabra contra el PDF original", AMBER],
  ["1", "política real ya vinculada (NDC 2025–2035) — la primera de muchas", DARK],
];
stats.forEach(([n, d, c], i) => {
  const x = 0.55 + i * 3.18;
  s.addShape(P.shapes.ROUNDED_RECTANGLE, { x, y: 2.0, w: 2.95, h: 3.15, fill: { color: CARD }, rectRadius: 0.1 });
  s.addText(n, { x, y: 2.25, w: 2.95, h: 1.15, align: "center", fontFace: H, fontSize: 60, bold: true, color: c, margin: 0 });
  s.addText(d, { x: x + 0.25, y: 3.55, w: 2.45, h: 1.35, align: "center", fontFace: B, fontSize: 12.5, color: MUTED, margin: 0, lineSpacing: 17 });
});
s.addText("Además: la plataforma web completa (dashboard, análisis, auditoría y configuración) y el primer vínculo publicación→política calculado con evidencia textual.", { x: 0.55, y: 5.65, w: 12.2, h: 0.75, align: "center", fontFace: B, fontSize: 13.5, color: TEXT, margin: 0, lineSpacing: 19 });
s.addNotes("Cifras para recordar: 24, 677, 96%, y la primera política real conectada. El 96% es la cifra de calidad: casi todas las frases extraídas existen literalmente en los documentos.");

/* ── 6 · Plataforma (dashboard) ───────────────────────────────── */
s = P.addSlide(); s.background = { color: WHITE };
header(s, "La plataforma", "El impacto, explorable en una pantalla");
s.addShape(P.shapes.ROUNDED_RECTANGLE, { x: 1.62, y: 1.62, w: 10.1, h: 5.32, fill: { color: WHITE }, line: { color: LINE, width: 1.25 }, rectRadius: 0.06, shadow: shadow() });
s.addImage({ path: "img/01_dashboard.png", x: 1.67, y: 1.67, w: 10.0, h: 6.25 * (900 / 1440) * (10.0 / 6.25) > 0 ? 6.25 : 6.25, sizing: { type: "contain", w: 10.0, h: 5.22 } });
s.addText("Panel ejecutivo: KPIs reales del corpus, temáticas y distribución del índice. Lo que ven es lo que hay: cada dato marcado “real” proviene del pipeline.", { x: 1.62, y: 7.0, w: 10.1, h: 0.4, align: "center", fontFace: B, fontSize: 11.5, italic: true, color: MUTED, margin: 0 });
s.addNotes("El dashboard resume el corpus. Todo lo etiquetado 'real' viene del procesamiento — lo que es ilustrativo está marcado como 'ejemplo'. Transparencia ante todo.");

/* ── 7 · Primer hallazgo ──────────────────────────────────────── */
s = P.addSlide(); s.background = { color: WHITE };
header(s, "El primer hallazgo real", "Hidrógeno verde: del estudio de ACA a la política nacional");
// línea de tiempo
const ty = 2.35;
s.addShape(P.shapes.LINE, { x: 1.1, y: ty + 0.21, w: 10.9, h: 0, line: { color: LINE, width: 2.5 } });
[["abr 2024", "ACA publica el estudio de hidrógeno verde", GREEN, 1.1],
 ["nov 2025", "Costa Rica presenta la NDC 2025–2035 ante la ONU", TEAL, 6.1],
 ["hoy", "El sistema encuentra 19 meses después la coincidencia más alta", AMBER, 11.1]].forEach(([f, t, c, x]) => {
  s.addShape(P.shapes.OVAL, { x: x + 0.35, y: ty + 0.07, w: 0.28, h: 0.28, fill: { color: c } });
  s.addText(f, { x, y: ty - 0.45, w: 2.6, h: 0.35, fontFace: B, fontSize: 13, bold: true, color: c, margin: 0 });
  s.addText(t, { x, y: ty + 0.5, w: 2.5, h: 1.1, fontFace: B, fontSize: 12, color: MUTED, margin: 0, lineSpacing: 16 });
});
// resultados
s.addShape(P.shapes.ROUNDED_RECTANGLE, { x: 0.55, y: 4.15, w: 6.0, h: 2.5, fill: { color: SOFT_G }, rectRadius: 0.1 });
s.addText("III 70.4%", { x: 0.85, y: 4.35, w: 5.4, h: 0.85, fontFace: H, fontSize: 44, bold: true, color: GREEN, margin: 0 });
s.addText("El vínculo más alto de las 24 publicaciones — y con la distancia temporal correcta (19 meses).", { x: 0.85, y: 5.3, w: 5.4, h: 1.1, fontFace: B, fontSize: 14, color: TEXT, margin: 0, lineSpacing: 19 });
s.addShape(P.shapes.ROUNDED_RECTANGLE, { x: 6.85, y: 4.15, w: 5.9, h: 2.5, fill: { color: CARD }, rectRadius: 0.1 });
s.addText([
  { text: "Alineación temática: ", options: { bold: true } }, { text: "86/100 en la escala del propio corpus.\n", options: {} },
  { text: "Propuestas coincidentes: ", options: { bold: true } }, { text: "79/100 contra las medidas de la NDC.\n", options: {} },
  { text: "Y el Congreso debate la ", options: {} }, { text: "ley de hidrógeno verde", options: { bold: true, color: GREEN } }, { text: " que el estudio pidió explícitamente.", options: {} },
], { x: 7.15, y: 4.4, w: 5.3, h: 2.0, fontFace: B, fontSize: 13.5, color: TEXT, margin: 0, lineSpacing: 22 });
s.addNotes("La historia completa: ACA publicó en abril 2024; el país presentó su contribución climática 19 meses después. El sistema encontró la coincidencia más alta de todo el corpus — y el estudio literalmente pedía 'que la legislatura conciba una ley de hidrógeno verde', que hoy se debate en el Congreso como expediente 22392.");

/* ── 8 · Evidencia textual ────────────────────────────────────── */
s = P.addSlide(); s.background = { color: WHITE };
header(s, "La evidencia", "Cada coincidencia se lee — y se puede verificar");
s.addShape(P.shapes.ROUNDED_RECTANGLE, { x: 0.75, y: 1.62, w: 8.35, h: 4.7, fill: { color: WHITE }, line: { color: LINE, width: 1.25 }, rectRadius: 0.06, shadow: shadow() });
s.addImage({ path: "img/03_tarjeta_politica.png", x: 0.8, y: 1.67, w: 8.25, h: 4.6 * (900 / 1440) * (8.25 / 4.6) > 0 ? 4.6 : 4.6, sizing: { type: "contain", w: 8.25, h: 4.6 } });
s.addText("La tarjeta muestra los tres componentes, el índice final y los pares de evidencia: la frase del estudio y la frase de la política.", { x: 0.75, y: 6.45, w: 8.3, h: 0.6, fontFace: B, fontSize: 11.5, italic: true, color: MUTED, margin: 0, lineSpacing: 15 });
s.addShape(P.shapes.ROUNDED_RECTANGLE, { x: 9.4, y: 1.62, w: 3.35, h: 4.7, fill: { color: SOFT_T }, rectRadius: 0.1 });
s.addText("Ejemplo del par #1", { x: 9.7, y: 1.85, w: 2.8, h: 0.35, fontFace: B, fontSize: 12, bold: true, color: TEAL, margin: 0 });
s.addText("ACA: “…hoja de ruta que sugiere enfocarse inicialmente en el transporte…”", { x: 9.7, y: 2.3, w: 2.8, h: 1.0, fontFace: B, fontSize: 11.5, italic: true, color: TEXT, margin: 0, lineSpacing: 15 });
s.addText("NDC: “Política de Incentivo al Transporte Público, que contemple subvenciones…”", { x: 9.7, y: 3.35, w: 2.8, h: 1.1, fontFace: B, fontSize: 11.5, italic: true, color: TEXT, margin: 0, lineSpacing: 15 });
s.addText("coincidencia semántica 0.63", { x: 9.7, y: 4.55, w: 2.8, h: 0.3, fontFace: B, fontSize: 11, bold: true, color: TEAL, margin: 0 });
s.addText("Con un clic, el PDF original se abre al lado para revisión humana.", { x: 9.7, y: 5.15, w: 2.85, h: 1.0, fontFace: B, fontSize: 11.5, color: MUTED, margin: 0, lineSpacing: 16 });
s.addNotes("Nada de cajas negras: la evidencia es textual, par por par, con su puntaje. Y cada propuesta puede revisarse contra el PDF original desde la propia plataforma.");

/* ── 9 · Rigor ────────────────────────────────────────────────── */
s = P.addSlide(); s.background = { color: WHITE };
header(s, "Rigor", "Lo que el sistema se niega a hacer");
const rigor = [
  ["Inventar causalidad", "Si la política es anterior a la publicación, el índice es cero — automáticamente. La influencia hacia atrás no existe.", TEAL],
  ["Aceptarse la palabra", "Toda recomendación se verifica palabra por palabra contra su PDF; la frase que no está en el documento queda marcada.", GREEN],
  ["Maquillar datos", "La plataforma etiqueta cada dato como real o de ejemplo. Nada se presenta como medido si no lo fue.", AMBER],
];
rigor.forEach(([t, d, c], i) => {
  const y = 1.8 + i * 1.7;
  s.addShape(P.shapes.OVAL, { x: 0.55, y: y + 0.05, w: 0.5, h: 0.5, fill: { color: c } });
  s.addText("✓", { x: 0.55, y: y + 0.03, w: 0.5, h: 0.5, align: "center", valign: "middle", fontFace: B, fontSize: 18, bold: true, color: WHITE, margin: 0 });
  s.addText(t, { x: 1.25, y, w: 6.0, h: 0.4, fontFace: B, fontSize: 17, bold: true, color: TEXT, margin: 0 });
  s.addText(d, { x: 1.25, y: y + 0.42, w: 6.2, h: 1.05, fontFace: B, fontSize: 13.5, color: MUTED, margin: 0, lineSpacing: 18 });
});
s.addShape(P.shapes.ROUNDED_RECTANGLE, { x: 7.95, y: 1.75, w: 4.8, h: 4.75, fill: { color: WHITE }, line: { color: LINE, width: 1.25 }, rectRadius: 0.06, shadow: shadow() });
s.addImage({ path: "img/04_auditoria.png", x: 8.0, y: 1.8, w: 4.7, h: 4.65 * (900 / 1440) * (4.7 / 4.65) > 0 ? 4.65 : 4.65, sizing: { type: "contain", w: 4.7, h: 4.65 } });
s.addText("Pantalla de auditoría: metodología y fórmulas abiertas.", { x: 7.95, y: 6.55, w: 4.8, h: 0.35, align: "center", fontFace: B, fontSize: 11, italic: true, color: MUTED, margin: 0 });
s.addNotes("Esto es lo que nos diferencia de un demo bonito: temporalidad causal estricta, verificación literal de cada frase, y transparencia real/ejemplo. Las metodología completa está documentada y auditable.");

/* ── 10 · Hoja de ruta ────────────────────────────────────────── */
s = P.addSlide(); s.background = { color: WHITE };
header(s, "Hoja de ruta", "De un piloto probado a un sistema de vigilancia continua");
const road = [
  ["YA ESTÁ", SOFT_G, GREEN, ["Cápsulas de conocimiento: qué recomendar, a quién, para qué", "Verificación literal automática de propuestas", "Primer vínculo real con política (NDC)"]],
  ["PRÓXIMO", SOFT_T, TEAL, ["Ley de hidrógeno verde (exp. 22392) y más políticas oficiales", "Fuentes sistemáticas: Asamblea, La Gaceta, ministerios", "Cápsulas para las 24 publicaciones"]],
  ["DESPUÉS", SOFT_A, AMBER, ["ICI: índice de canales de influencia (quién escucha a ACA)", "Alertas automáticas de nuevas coincidencias", "Informe trimestral de impacto para la Junta"]],
];
road.forEach(([t, bg, c, items], i) => {
  const x = 0.55 + i * 4.18;
  s.addShape(P.shapes.ROUNDED_RECTANGLE, { x, y: 1.8, w: 3.85, h: 4.6, fill: { color: bg }, rectRadius: 0.1 });
  s.addText(t, { x: x + 0.3, y: 2.05, w: 3.2, h: 0.4, fontFace: B, fontSize: 14, bold: true, charSpacing: 2, color: c, margin: 0 });
  s.addText(items.map((it, j) => ({ text: it, options: { bullet: bu(), breakLine: j < items.length - 1, color: TEXT } })),
    { x: x + 0.3, y: 2.6, w: 3.3, h: 3.6, fontFace: B, fontSize: 13, paraSpaceAfter: 12, margin: 0, lineSpacing: 17 });
});
s.addNotes("Tres horizontes. Lo importante del 'próximo': ya identificamos las fuentes oficiales y el mecanismo está listo — cada política nueva que entra, se compara en minutos. El ICI mide canales: audiencias, citaciones, menciones.");

/* ── 11 · Qué necesitamos ─────────────────────────────────────── */
s = P.addSlide(); s.background = { color: WHITE };
header(s, "Decisiones", "Qué necesitamos de esta Junta");
const asks = [
  ["Validar las prioridades", "Confirmar las políticas e instituciones a vigilar — partimos del plan de 14 instituciones ya definido."],
  ["Abrir las puertas oficiales", "Cartas o contactos para acceso sistemático a Asamblea Legislativa, La Gaceta y ministerios."],
  ["Presupuesto operacional", "Procesamiento con IA del orden de US$10–15 al mes. El desarrollo pesado ya está pagado."],
  ["Mandato para la fase 2", "Medición trimestral con informe de impacto a la Junta — el sistema ya produce la materia prima."],
];
asks.forEach(([t, d], i) => {
  const x = 0.55 + (i % 2) * 6.35, y = 1.85 + Math.floor(i / 2) * 2.35;
  s.addShape(P.shapes.ROUNDED_RECTANGLE, { x, y, w: 6.0, h: 2.05, fill: { color: i === 3 ? SOFT_G : CARD }, rectRadius: 0.1 });
  numDot(s, x + 0.3, y + 0.3, i + 1, i === 3 ? GREEN : TEAL, 0.48);
  s.addText(t, { x: x + 1.0, y: y + 0.22, w: 4.8, h: 0.4, fontFace: B, fontSize: 16.5, bold: true, color: TEXT, margin: 0 });
  s.addText(d, { x: x + 1.0, y: y + 0.68, w: 4.75, h: 1.2, fontFace: B, fontSize: 13, color: MUTED, margin: 0, lineSpacing: 18 });
});
s.addNotes("Cuatro decisiones concretas. La número 3 es deliberadamente pequeña: el costo mensual es menor que una cena. La 4 convierte el piloto en un activo institucional permanente.");

/* ── 12 · Cierre (oscura) ─────────────────────────────────────── */
s = P.addSlide(); s.background = { color: DARK };
s.addShape(P.shapes.OVAL, { x: -2.5, y: 4.4, w: 6.5, h: 6.5, fill: { color: DARK2, transparency: 40 } });
s.addShape(P.shapes.OVAL, { x: 11.4, y: -1.8, w: 4.5, h: 4.5, fill: { color: TEAL, transparency: 72 } });
s.addText("Las ideas de ACA ya influyen\nen la política pública.", { x: 0.9, y: 2.1, w: 11.5, h: 1.9, fontFace: H, fontSize: 44, bold: true, color: WHITE, margin: 0, lineSpacing: 54 });
s.addText("Ahora podemos demostrarlo — propuesta por propuesta, política por política.", { x: 0.9, y: 4.15, w: 10.5, h: 0.6, fontFace: B, fontSize: 19, color: ICE, margin: 0 });
s.addShape(P.shapes.LINE, { x: 0.95, y: 5.15, w: 2.2, h: 0, line: { color: TEAL, width: 2.5 } });
s.addText("Sistema de Inteligencia ACA · Demo en vivo disponible · Metodología documentada", { x: 0.9, y: 5.35, w: 10.5, h: 0.4, fontFace: B, fontSize: 13, color: ICE, margin: 0 });
s.addNotes("Cierre: invitar al demo en vivo con la plataforma, y abrir la discusión sobre las cuatro decisiones.");

P.writeFile({ fileName: "ACA_Del_papel_a_la_politica_publica.pptx" }).then(() => console.log("PPTX generado"));
