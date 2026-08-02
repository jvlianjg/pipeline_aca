// ═══════════════════════════════════════════════════════════════
//  mockData.ts — generado automáticamente desde datos reales ACA
//  Generator: web/gen_mockdata_ts.py
//
//  NOTA: publicaciones, themeImpacts, kpiData.iii y impactosIII
//  derivan de los 29 PDFs reales del pipeline. El resto (autores,
//  políticas, actas, menciones, ICI, audits) es mock ilustrativo
//  coherente con el dominio costarricense.
// ═══════════════════════════════════════════════════════════════

import type {
  Autor, Tema, Institucion, Medio, Publicacion, PoliticaPublica,
  ImpactoIII, ActaLegislativa, MencionMedio, ImpactoICIPolitico,
  ImpactoICIMedios, AuditResult, MonthlyTrend, ThemeImpact, KPIData
} from '@/types';

export const autores: Autor[] = [
  {
    "id": "aut-1",
    "nombre": "Dr. Carlos Hernández Álvarez",
    "tipo": "Research Fellow"
  },
  {
    "id": "aut-2",
    "nombre": "Dra. María Elena Castillo",
    "tipo": "Asociado"
  },
  {
    "id": "aut-3",
    "nombre": "Dr. Jorge Manuel Soto",
    "tipo": "Research Fellow"
  },
  {
    "id": "aut-4",
    "nombre": "Dra. Ana Lucía Fernández",
    "tipo": "Asociado"
  },
  {
    "id": "aut-5",
    "nombre": "Dr. Roberto Guillén",
    "tipo": "Institucional"
  },
  {
    "id": "aut-6",
    "nombre": "Dra. Patricia Vargas",
    "tipo": "Research Fellow"
  },
  {
    "id": "aut-7",
    "nombre": "Dr. Eduardo Mora",
    "tipo": "Asociado"
  },
  {
    "id": "aut-8",
    "nombre": "Comité de Investigación ACA",
    "tipo": "Institucional"
  }
];
export const temas: Tema[] = [
  {
    "id": "tem-1",
    "nombre": "Política Fiscal",
    "descripcion": "Reforma tributaria, gasto público y sostenibilidad fiscal"
  },
  {
    "id": "tem-2",
    "nombre": "Seguridad Social",
    "descripcion": "Sistema de pensiones, CCSS, IVM y salud pública"
  },
  {
    "id": "tem-3",
    "nombre": "Educación",
    "descripcion": "Reforma educativa, educación superior y técnica"
  },
  {
    "id": "tem-4",
    "nombre": "Empleo",
    "descripcion": "Mercado laboral, desempleo y empleo joven"
  },
  {
    "id": "tem-5",
    "nombre": "Medio Ambiente",
    "descripcion": "Cambio climático, energía y biodiversidad"
  },
  {
    "id": "tem-6",
    "nombre": "Gobernabilidad",
    "descripcion": "Institucionalidad, transparencia y combate a la corrupción"
  },
  {
    "id": "tem-7",
    "nombre": "Comercio Exterior",
    "descripcion": "Exportaciones, tratados comerciales e inversión extranjera"
  },
  {
    "id": "tem-8",
    "nombre": "Salud",
    "descripcion": "Políticas de salud pública y acceso a servicios"
  }
];
export const instituciones: Institucion[] = [
  {
    "id": "ins-1",
    "nombre": "Asamblea Legislativa",
    "sector": "Legislativo"
  },
  {
    "id": "ins-2",
    "nombre": "Ministerio de Hacienda",
    "sector": "Ejecutivo"
  },
  {
    "id": "ins-3",
    "nombre": "CCSS",
    "sector": "Ejecutivo"
  },
  {
    "id": "ins-4",
    "nombre": "MEP",
    "sector": "Ejecutivo"
  },
  {
    "id": "ins-5",
    "nombre": "Ministerio de Trabajo",
    "sector": "Ejecutivo"
  },
  {
    "id": "ins-6",
    "nombre": "MINAE",
    "sector": "Ejecutivo"
  },
  {
    "id": "ins-7",
    "nombre": "Ministerio de Salud",
    "sector": "Ejecutivo"
  },
  {
    "id": "ins-8",
    "nombre": "COMEX",
    "sector": "Ejecutivo"
  },
  {
    "id": "ins-9",
    "nombre": "Poder Judicial",
    "sector": "Judicial"
  },
  {
    "id": "ins-10",
    "nombre": "Contraloría General",
    "sector": "Control"
  }
];
export const medios: Medio[] = [
  {
    "id": "med-1",
    "nombre": "La Nación",
    "tipo": "Digital",
    "alcance": "Nacional"
  },
  {
    "id": "med-2",
    "nombre": "CRHoy",
    "tipo": "Digital",
    "alcance": "Nacional"
  },
  {
    "id": "med-3",
    "nombre": "Semanario Universidad",
    "tipo": "Digital",
    "alcance": "Nacional"
  },
  {
    "id": "med-4",
    "nombre": "El Financiero",
    "tipo": "Digital",
    "alcance": "Especializado"
  },
  {
    "id": "med-5",
    "nombre": "Teletica",
    "tipo": "Televisión",
    "alcance": "Nacional"
  },
  {
    "id": "med-6",
    "nombre": "La República",
    "tipo": "Digital",
    "alcance": "Nacional"
  },
  {
    "id": "med-7",
    "nombre": "Amelia Rueda",
    "tipo": "Digital",
    "alcance": "Nacional"
  },
  {
    "id": "med-8",
    "nombre": "La Teja",
    "tipo": "Digital",
    "alcance": "Nacional"
  }
];
export const publicaciones: Publicacion[] = [
  {
    "id": "pub-1",
    "titulo": "CGV Encadenamientos Derrames",
    "fechaPublicacion": "2022-07-20",
    "autorId": "aut-4",
    "temaId": "tem-5",
    "textoLimpio": "Asimismo, se debería evaluar la posibilidad de diseñar o adaptar incentivos para atraer flujos de IED más propensos a desarrollar encadenamientos productivos con empresas locales.",
    "excerpt": "Asimismo, se debería evaluar la posibilidad de diseñar o adaptar incentivos para atraer flujos de IED más propensos a desarrollar encadenamientos productivos con empresas locales."
  },
  {
    "id": "pub-2",
    "titulo": "Fortaleciendo-el-Ecosistema-Emprendedor-de-Costa-Rica-",
    "fechaPublicacion": "2023-03-01",
    "autorId": "aut-7",
    "temaId": "tem-4",
    "textoLimpio": "Si bien las políticas de acompañamiento a las MIPYMES buscan construir una estructura coherente y progresiva de ayudas para el mejoramiento productivo, se requiere más trabajo para consolidar una polí…",
    "excerpt": "Si bien las políticas de acompañamiento a las MIPYMES buscan construir una estructura coherente y progresiva de ayudas para el mejoramiento productivo, se requiere más trabajo para consolidar una polí…"
  },
  {
    "id": "pub-3",
    "titulo": "20 Politica-fiscal-en-Costa-Rica-2021",
    "fechaPublicacion": "2022-10-31",
    "autorId": "aut-2",
    "temaId": "tem-1",
    "textoLimpio": "Reforzar la institucionalidad fiscal con el objetivo de mejorar la credibilidad de la política fiscal La política monetaria se ha caracterizado por mejorar la credibilidad a través de una mayor indepe…",
    "excerpt": "Reforzar la institucionalidad fiscal con el objetivo de mejorar la credibilidad de la política fiscal La política monetaria se ha caracterizado por mejorar la credibilidad a través de una mayor indepe…"
  },
  {
    "id": "pub-4",
    "titulo": "Cargas-sobre-el-trabajo-parafiscalidad-y-seguridad-social",
    "fechaPublicacion": "2023-02-06",
    "autorId": "aut-5",
    "temaId": "tem-1",
    "textoLimpio": "En ese sentido, se recomienda explorar fuentes alternativas de financiamiento para la seguridad social.",
    "excerpt": "En ese sentido, se recomienda explorar fuentes alternativas de financiamiento para la seguridad social."
  },
  {
    "id": "pub-5",
    "titulo": "Retos-y-propuestas-para-el-Sistema-Nacional-de-Salud Informe-Completo",
    "fechaPublicacion": "2022-09-06",
    "autorId": "aut-8",
    "temaId": "tem-8",
    "textoLimpio": "Además, aunque en un futuro se debe reforzar la sostenibilidad del sistema público de salud, el país disfruta de estabilidad respecto al financiamiento y la planificación del sector, brinda una sobres…",
    "excerpt": "Además, aunque en un futuro se debe reforzar la sostenibilidad del sistema público de salud, el país disfruta de estabilidad respecto al financiamiento y la planificación del sector, brinda una sobres…"
  },
  {
    "id": "pub-6",
    "titulo": "Propuestas-para-un-mejor-futuro",
    "fechaPublicacion": "2023-07-18",
    "autorId": "aut-3",
    "temaId": "tem-1",
    "textoLimpio": "No menos importante, dicha institucionalidad debe poder crear los mecanismos de monitoreo, evaluación y rendición de cuentas, que permitan corregir el rumbo, cuando ello se amerite, a través del tiemp…",
    "excerpt": "No menos importante, dicha institucionalidad debe poder crear los mecanismos de monitoreo, evaluación y rendición de cuentas, que permitan corregir el rumbo, cuando ello se amerite, a través del tiemp…"
  },
  {
    "id": "pub-7",
    "titulo": "Hacia políticas públicas a favor de la competencia y la protección del consumidor",
    "fechaPublicacion": "2022-07-20",
    "autorId": "aut-6",
    "temaId": "tem-7",
    "textoLimpio": "Según Bork (2021), uno de sus principales exponentes, esta legislación no debe verse como un medio de mejorar la distribución de la riqueza o proteger a pequeñas empresas, sino que su objetivo debe ce…",
    "excerpt": "Según Bork (2021), uno de sus principales exponentes, esta legislación no debe verse como un medio de mejorar la distribución de la riqueza o proteger a pequeñas empresas, sino que su objetivo debe ce…"
  },
  {
    "id": "pub-8",
    "titulo": "Despues-de-la-pandemia una-vision-de-largo-plazo-002",
    "fechaPublicacion": "2023-02-06",
    "autorId": "aut-1",
    "temaId": "tem-1",
    "textoLimpio": "Hoy, sacar adelante esta tarea debe ser la preocupación principal de quienes tienen en sus manos la responsabilidad de tomar las decisiones sobre las políticas públicas.",
    "excerpt": "Hoy, sacar adelante esta tarea debe ser la preocupación principal de quienes tienen en sus manos la responsabilidad de tomar las decisiones sobre las políticas públicas."
  },
  {
    "id": "pub-9",
    "titulo": "Estudio sobre la implementación de la nueva ley del INA",
    "fechaPublicacion": "2022-04-18",
    "autorId": "aut-4",
    "temaId": "tem-3",
    "textoLimpio": "En segundo lugar, la reforma del régimen laboral, que se propone ubicar fuera del Régimen de Servicio Civil y el ámbito de la Autoridad Presupuestaria, al mismo tiempo que se habilita el uso del derec…",
    "excerpt": "En segundo lugar, la reforma del régimen laboral, que se propone ubicar fuera del Régimen de Servicio Civil y el ámbito de la Autoridad Presupuestaria, al mismo tiempo que se habilita el uso del derec…"
  },
  {
    "id": "pub-10",
    "titulo": "Transitando-a-la-circularidad",
    "fechaPublicacion": "2023-01-03",
    "autorId": "aut-7",
    "temaId": "tem-5",
    "textoLimpio": "Vacío legal en gestión de residuos orgánicos Conclusión: existe un vacío legal con relación a la gestión de residuos orgánicos, por lo cual, según el Ministerio de Salud, se está elaborando un reglame…",
    "excerpt": "Vacío legal en gestión de residuos orgánicos Conclusión: existe un vacío legal con relación a la gestión de residuos orgánicos, por lo cual, según el Ministerio de Salud, se está elaborando un reglame…"
  },
  {
    "id": "pub-11",
    "titulo": "Reciclaje de activos públicos",
    "fechaPublicacion": "2022-02-25",
    "autorId": "aut-2",
    "temaId": "tem-5",
    "textoLimpio": "Para ello, debemos tener presente que el éxito no debe medirse necesariamente por inicios de obra o inauguraciones, sino también por el avance que se realice en actividades clave como la relocalizació…",
    "excerpt": "Para ello, debemos tener presente que el éxito no debe medirse necesariamente por inicios de obra o inauguraciones, sino también por el avance que se realice en actividades clave como la relocalizació…"
  },
  {
    "id": "pub-12",
    "titulo": "Acción Humana Eficaz",
    "fechaPublicacion": "2022-04-19",
    "autorId": "aut-5",
    "temaId": "tem-1",
    "textoLimpio": "Hay que estar dispuesto a sudar.",
    "excerpt": "Hay que estar dispuesto a sudar."
  },
  {
    "id": "pub-13",
    "titulo": "Regulacion-a-las-comisiones-de-tarjetas-de-pago",
    "fechaPublicacion": "2022-11-29",
    "autorId": "aut-8",
    "temaId": "tem-7",
    "textoLimpio": "El BCCR parece haber interpretado este mandato como una justificación para establecer comisiones máximas de intercambio y adquirencia, de tal forma que recuperen únicamente los costos operacionales y…",
    "excerpt": "El BCCR parece haber interpretado este mandato como una justificación para establecer comisiones máximas de intercambio y adquirencia, de tal forma que recuperen únicamente los costos operacionales y…"
  },
  {
    "id": "pub-14",
    "titulo": "10 propuestas para mayor bienestar",
    "fechaPublicacion": "2021-11-02",
    "autorId": "aut-3",
    "temaId": "tem-1",
    "textoLimpio": "Costa Rica MATIC Convertirse en un “territorio MATIC” le őŅÁäŅĈÁ\u0003Á\u0003\u001dĩŉőÁ\u0003ĆÚÁ\u0003ġŗěőĆłěäŉ\u0003ÙäĢäƈÚĆĩŉ͠ \u0003ÁŅÁ\u0003 lograrlos, las reformas deben ser múltiples; materializarlas dependerá de una estrategia nacio…",
    "excerpt": "Costa Rica MATIC Convertirse en un “territorio MATIC” le őŅÁäŅĈÁ\u0003Á\u0003\u001dĩŉőÁ\u0003ĆÚÁ\u0003ġŗěőĆłěäŉ\u0003ÙäĢäƈÚĆĩŉ͠ \u0003ÁŅÁ\u0003 lograrlos, las reformas deben ser múltiples; materializarlas dependerá de una estrategia nacio…"
  },
  {
    "id": "pub-15",
    "titulo": "Integridad 365",
    "fechaPublicacion": "2023-08-21",
    "autorId": "aut-6",
    "temaId": "tem-6",
    "textoLimpio": "Pero más tarde, con pausa, deben recorrerse las acciones que se efectuaron casi inconscientemente.",
    "excerpt": "Pero más tarde, con pausa, deben recorrerse las acciones que se efectuaron casi inconscientemente."
  },
  {
    "id": "pub-16",
    "titulo": "Desempleo, pobreza y desigualdad en Costa Rica durante la pandemia por el COVID-19 Informe",
    "fechaPublicacion": "2021-12-08",
    "autorId": "aut-1",
    "temaId": "tem-4",
    "textoLimpio": "I y II Trimestre del 2020 Cuadro 7 Flujo de movilidad de la población ocupada del sector de Servicios.",
    "excerpt": "I y II Trimestre del 2020 Cuadro 7 Flujo de movilidad de la población ocupada del sector de Servicios."
  },
  {
    "id": "pub-17",
    "titulo": "Promoción-de-la-competencia-en-beneficio-del-consumidor avances-y-retos-en-Costa-Rica",
    "fechaPublicacion": "2021-06-26",
    "autorId": "aut-4",
    "temaId": "tem-7",
    "textoLimpio": "Importancia y beneficios de la competencia Para que exista competencia es necesario que los diversos grupos económicos oferentes y demandantes en los mercados sean rivales vigorosos entre sí y que nin…",
    "excerpt": "Importancia y beneficios de la competencia Para que exista competencia es necesario que los diversos grupos económicos oferentes y demandantes en los mercados sean rivales vigorosos entre sí y que nin…"
  },
  {
    "id": "pub-18",
    "titulo": "El-efecto-de-la-regulacion-sobre-comisiones",
    "fechaPublicacion": "2023-12-04",
    "autorId": "aut-7",
    "temaId": "tem-7",
    "textoLimpio": "En la sección 4 se comentan los resultados de las estimaciones de los impactos de la política generada a partir de la nueva ley y en la sección 5 se presentan las conclusiones. 1 Se debe notar que, c…",
    "excerpt": "En la sección 4 se comentan los resultados de las estimaciones de los impactos de la política generada a partir de la nueva ley y en la sección 5 se presentan las conclusiones. 1 Se debe notar que, c…"
  },
  {
    "id": "pub-19",
    "titulo": "brechas-capital-humano-profesional",
    "fechaPublicacion": "2024-03-19",
    "autorId": "aut-2",
    "temaId": "tem-3",
    "textoLimpio": "Esto de debe a que las encuestas de empleo suelen describir la estructura actual del empleo y por ello omiten la posibilidad de que las empresas contraten trabajadores con un nivel de educación o tipo…",
    "excerpt": "Esto de debe a que las encuestas de empleo suelen describir la estructura actual del empleo y por ello omiten la posibilidad de que las empresas contraten trabajadores con un nivel de educación o tipo…"
  },
  {
    "id": "pub-20",
    "titulo": "Ideas-y-personajes-de-Costa-Rica-durante-el-periodo-de-la-Independencia",
    "fechaPublicacion": "2021-08-13",
    "autorId": "aut-5",
    "temaId": "tem-6",
    "textoLimpio": "Entre los antecedentes ideológicos del período estudiado hay que considerar el auge del liberalismo en Europa y los Estados Unidos de América durante los siglos XVII, XVIII y principios del siglo XIX.",
    "excerpt": "Entre los antecedentes ideológicos del período estudiado hay que considerar el auge del liberalismo en Europa y los Estados Unidos de América durante los siglos XVII, XVIII y principios del siglo XIX."
  },
  {
    "id": "pub-21",
    "titulo": "Realides embusteras Un análisis crítico sobre la desinformación",
    "fechaPublicacion": "2022-01-31",
    "autorId": "aut-8",
    "temaId": "tem-6",
    "textoLimpio": "Son parte de un amplio repertorio de posibilidades al que a menudo echan mano los manipuTILWZM[\u0003LM\u0003TI\u0003^MZLIL\u0003a\u0003OMVMZILWZM[\u0003LM\u0003LM[QVNWZUIKQ~V\u0016\u0003-T\u0003UMV\u0003 LM\u0003ZMK]Z[W[\u0003a\u0003Uu\\WLW[\u0003PI\u0003[QLW\u0003ZMKIZOILW\u0014\u0003MV\u0003IUXTQ…",
    "excerpt": "Son parte de un amplio repertorio de posibilidades al que a menudo echan mano los manipuTILWZM[\u0003LM\u0003TI\u0003^MZLIL\u0003a\u0003OMVMZILWZM[\u0003LM\u0003LM[QVNWZUIKQ~V\u0016\u0003-T\u0003UMV\u0003 LM\u0003ZMK]Z[W[\u0003a\u0003Uu\\WLW[\u0003PI\u0003[QLW\u0003ZMKIZOILW\u0014\u0003MV\u0003IUXTQ…"
  },
  {
    "id": "pub-22",
    "titulo": "en-busca-de-una-productividad-inclusiva",
    "fechaPublicacion": "2024-05-16",
    "autorId": "aut-3",
    "temaId": "tem-4",
    "textoLimpio": "En ese sentido, se sugiere como hipótesis que el punto de inflexión del crecimiento de la productividad laboral en el 2005 puede asociarse a una mayor inserción de empresas nacionales en la venta de b…",
    "excerpt": "En ese sentido, se sugiere como hipótesis que el punto de inflexión del crecimiento de la productividad laboral en el 2005 puede asociarse a una mayor inserción de empresas nacionales en la venta de b…"
  },
  {
    "id": "pub-23",
    "titulo": "Incentivos-y-obstaculos-para-la-implementacion-del-Hidrogeno-Verde-en-Costa-Rica",
    "fechaPublicacion": "2024-04-05",
    "autorId": "aut-6",
    "temaId": "tem-5",
    "textoLimpio": "La primera etapa de la hoja de ruta ya está avanzada, con apoyo del MINAE, Inteco y verde también está avanzado, pero se requiere una revisión de la propuesta de ley presentada a la Asamblea de Costa…",
    "excerpt": "La primera etapa de la hoja de ruta ya está avanzada, con apoyo del MINAE, Inteco y verde también está avanzado, pero se requiere una revisión de la propuesta de ley presentada a la Asamblea de Costa…"
  },
  {
    "id": "pub-24",
    "titulo": "La-reforma-del-sistema-bancario-en-Costa-Rica.-Acontecimientos-en-las-ultimas-dos-decadas",
    "fechaPublicacion": "2021-02-17",
    "autorId": "aut-1",
    "temaId": "tem-1",
    "textoLimpio": "Este documento se propone actualizar los acontecimientos en materia de reforma financiera en las dos últimas décadas.",
    "excerpt": "Este documento se propone actualizar los acontecimientos en materia de reforma financiera en las dos últimas décadas."
  },
  {
    "id": "pub-25",
    "titulo": "Ensayos-en-honor-a-Miguel-Angel-Rodriguez-Echeverria web",
    "fechaPublicacion": "2021-02-08",
    "autorId": "aut-4",
    "temaId": "tem-1",
    "textoLimpio": "¿Por dónde deberíamos empezar?",
    "excerpt": "¿Por dónde deberíamos empezar?"
  },
  {
    "id": "pub-26",
    "titulo": "Impactos-economicos-y-sociales-de-la-fijacion-de-topes-maximos-a-las-tasas-de-interes-en-c",
    "fechaPublicacion": "2025-06-12",
    "autorId": "aut-7",
    "temaId": "tem-1",
    "textoLimpio": "No obstante, se debe indicar que en Costa Rica no existe una base de datos pública que contenga la información de los activos y pasivos de todos los habitantes o de un conjunto de habitantes del país;…",
    "excerpt": "No obstante, se debe indicar que en Costa Rica no existe una base de datos pública que contenga la información de los activos y pasivos de todos los habitantes o de un conjunto de habitantes del país;…"
  },
  {
    "id": "pub-27",
    "titulo": "Empleo-y-la-desigualdad-salarial-Academia",
    "fechaPublicacion": "2025-07-09",
    "autorId": "aut-2",
    "temaId": "tem-4",
    "textoLimpio": "La autorización para reproducir total o parcialmente esta obra debe solicitarse a la Comisión Económica para América Latina y el Caribe (CEPAL), División de Documentos y Publicaciones, publicaciones.c…",
    "excerpt": "La autorización para reproducir total o parcialmente esta obra debe solicitarse a la Comisión Económica para América Latina y el Caribe (CEPAL), División de Documentos y Publicaciones, publicaciones.c…"
  },
  {
    "id": "pub-28",
    "titulo": "ESTUDIOKAS IA",
    "fechaPublicacion": "2024-12-11",
    "autorId": "aut-5",
    "temaId": "tem-1",
    "textoLimpio": "Tercero, más allá de los cursos especíﬁcos sobre inteligencia artiﬁcial, el nuevo programa de formación tecnológica debe aprovechar la coyuntura de su reciente implementación (inició en el año 2024) p…",
    "excerpt": "Tercero, más allá de los cursos especíﬁcos sobre inteligencia artiﬁcial, el nuevo programa de formación tecnológica debe aprovechar la coyuntura de su reciente implementación (inició en el año 2024) p…"
  },
  {
    "id": "pub-29",
    "titulo": "SFC 7",
    "fechaPublicacion": "2025-12-10",
    "autorId": "aut-8",
    "temaId": "tem-1",
    "textoLimpio": "El cumplimiento de este esquema resulta especialmente costoso y complejo para intermediarios de menor escala, que deben asumir estándares similares a los de entidades grandes pese a tener recursos muc…",
    "excerpt": "El cumplimiento de este esquema resulta especialmente costoso y complejo para intermediarios de menor escala, que deben asumir estándares similares a los de entidades grandes pese a tener recursos muc…"
  }
];
export const politicasPublicas: PoliticaPublica[] = [
  {
    "id": "pol-1",
    "nombre": "Proyecto de Ley Modernización Régimen IVM N°23.420",
    "institucionId": "ins-3",
    "fechaEmision": "2025-02-10",
    "textoLimpio": "Proyecto de Ley Modernización Régimen IVM N°23.420 — medida de política pública adoptada por el gobierno de Costa Rica.",
    "excerpt": "Proyecto de Ley Modernización Régimen IVM N°23.420"
  },
  {
    "id": "pol-2",
    "nombre": "Decreto Ejecutivo Transferencia Competencias Regionales MEP",
    "institucionId": "ins-4",
    "fechaEmision": "2025-05-17",
    "textoLimpio": "Decreto Ejecutivo Transferencia Competencias Regionales MEP — medida de política pública adoptada por el gobierno de Costa Rica.",
    "excerpt": "Decreto Ejecutivo Transferencia Competencias Regionales MEP"
  },
  {
    "id": "pol-3",
    "nombre": "Ley de Impuestos al Carbono y Descarbonización N°24.105",
    "institucionId": "ins-6",
    "fechaEmision": "2025-04-14",
    "textoLimpio": "Ley de Impuestos al Carbono y Descarbonización N°24.105 — medida de política pública adoptada por el gobierno de Costa Rica.",
    "excerpt": "Ley de Impuestos al Carbono y Descarbonización N°24.105"
  },
  {
    "id": "pol-4",
    "nombre": "Reforma Fiscal Integral — Plan de Hacienda 2025-2028",
    "institucionId": "ins-2",
    "fechaEmision": "2025-02-27",
    "textoLimpio": "Reforma Fiscal Integral — Plan de Hacienda 2025-2028 — medida de política pública adoptada por el gobierno de Costa Rica.",
    "excerpt": "Reforma Fiscal Integral — Plan de Hacienda 2025-2028"
  },
  {
    "id": "pol-5",
    "nombre": "Ley de Empleo Joven y Primer Empleo N°24.200",
    "institucionId": "ins-5",
    "fechaEmision": "2025-02-28",
    "textoLimpio": "Ley de Empleo Joven y Primer Empleo N°24.200 — medida de política pública adoptada por el gobierno de Costa Rica.",
    "excerpt": "Ley de Empleo Joven y Primer Empleo N°24.200"
  },
  {
    "id": "pol-6",
    "nombre": "Decreto Plataforma de Datos Abiertos del Estado",
    "institucionId": "ins-2",
    "fechaEmision": "2025-07-11",
    "textoLimpio": "Decreto Plataforma de Datos Abiertos del Estado — medida de política pública adoptada por el gobierno de Costa Rica.",
    "excerpt": "Decreto Plataforma de Datos Abiertos del Estado"
  },
  {
    "id": "pol-7",
    "nombre": "Reforma al Sistema Bancario Nacional",
    "institucionId": "ins-2",
    "fechaEmision": "2025-01-12",
    "textoLimpio": "Reforma al Sistema Bancario Nacional — medida de política pública adoptada por el gobierno de Costa Rica.",
    "excerpt": "Reforma al Sistema Bancario Nacional"
  },
  {
    "id": "pol-8",
    "nombre": "Política de Competencia y Protección al Consumidor",
    "institucionId": "ins-1",
    "fechaEmision": "2025-04-17",
    "textoLimpio": "Política de Competencia y Protección al Consumidor — medida de política pública adoptada por el gobierno de Costa Rica.",
    "excerpt": "Política de Competencia y Protección al Consumidor"
  },
  {
    "id": "pol-9",
    "nombre": "Estrategia Nacional de Hidrógeno Verde",
    "institucionId": "ins-6",
    "fechaEmision": "2025-01-27",
    "textoLimpio": "Estrategia Nacional de Hidrógeno Verde — medida de política pública adoptada por el gobierno de Costa Rica.",
    "excerpt": "Estrategia Nacional de Hidrógeno Verde"
  },
  {
    "id": "pol-10",
    "nombre": "Plan Nacional de Salud 2025-2030",
    "institucionId": "ins-7",
    "fechaEmision": "2025-04-27",
    "textoLimpio": "Plan Nacional de Salud 2025-2030 — medida de política pública adoptada por el gobierno de Costa Rica.",
    "excerpt": "Plan Nacional de Salud 2025-2030"
  }
];
export const impactosIII: ImpactoIII[] = [
  {
    "id": "imp-1",
    "pubId": "pub-1",
    "politicaId": "pol-7",
    "scoreTematico": 0.75,
    "diasDiferencia": 66,
    "pesoTemporal": 1.0,
    "nivelAdopcion": "PARCIAL",
    "confianzaLLM": 0.83,
    "evidenciaTextual": "Asimismo, se debería evaluar la posibilidad de diseñar o adaptar incentivos para atraer flujos de IED más propensos a de",
    "justificacionLLM": "La política adopta elementos del análisis sobre CGV_Encadenamientos_Derrames con un nivel de adopción parcial.",
    "iiiScoreFinal": 0.69,
    "fechaCalculo": "2025-03-23T10:00:00Z"
  },
  {
    "id": "imp-2",
    "pubId": "pub-2",
    "politicaId": "pol-5",
    "scoreTematico": 0.78,
    "diasDiferencia": 404,
    "pesoTemporal": 1.0,
    "nivelAdopcion": "PARCIAL",
    "confianzaLLM": 0.83,
    "evidenciaTextual": "Si bien las políticas de acompañamiento a las MIPYMES buscan construir una estructura coherente y progresiva de ayudas p",
    "justificacionLLM": "La política adopta elementos del análisis sobre Fortaleciendo-el-Ecosistema-Emprendedor- con un nivel de adopción parcial.",
    "iiiScoreFinal": 0.69,
    "fechaCalculo": "2025-02-03T10:00:00Z"
  },
  {
    "id": "imp-3",
    "pubId": "pub-3",
    "politicaId": "pol-6",
    "scoreTematico": 0.81,
    "diasDiferencia": 104,
    "pesoTemporal": 1.0,
    "nivelAdopcion": "TOTAL",
    "confianzaLLM": 0.77,
    "evidenciaTextual": "Reforzar la institucionalidad fiscal con el objetivo de mejorar la credibilidad de la política fiscal La política moneta",
    "justificacionLLM": "La política adopta elementos del análisis sobre 20_Politica-fiscal-en-Costa-Rica-2021 con un nivel de adopción total.",
    "iiiScoreFinal": 0.75,
    "fechaCalculo": "2025-08-18T10:00:00Z"
  },
  {
    "id": "imp-4",
    "pubId": "pub-4",
    "politicaId": "pol-7",
    "scoreTematico": 0.7,
    "diasDiferencia": 693,
    "pesoTemporal": 0.6,
    "nivelAdopcion": "PARCIAL",
    "confianzaLLM": 0.79,
    "evidenciaTextual": "En ese sentido, se recomienda explorar fuentes alternativas de financiamiento para la seguridad social.",
    "justificacionLLM": "La política adopta elementos del análisis sobre Cargas-sobre-el-trabajo-parafiscalidad-y con un nivel de adopción parcial.",
    "iiiScoreFinal": 0.67,
    "fechaCalculo": "2025-06-19T10:00:00Z"
  },
  {
    "id": "imp-5",
    "pubId": "pub-5",
    "politicaId": "pol-2",
    "scoreTematico": 0.69,
    "diasDiferencia": 356,
    "pesoTemporal": 1.0,
    "nivelAdopcion": "PARCIAL",
    "confianzaLLM": 0.8,
    "evidenciaTextual": "Además, aunque en un futuro se debe reforzar la sostenibilidad del sistema público de salud, el país disfruta de estabil",
    "justificacionLLM": "La política adopta elementos del análisis sobre Retos-y-propuestas-para-el-Sistema-Nacio con un nivel de adopción parcial.",
    "iiiScoreFinal": 0.66,
    "fechaCalculo": "2025-02-28T10:00:00Z"
  },
  {
    "id": "imp-6",
    "pubId": "pub-6",
    "politicaId": "pol-2",
    "scoreTematico": 0.74,
    "diasDiferencia": 433,
    "pesoTemporal": 1.0,
    "nivelAdopcion": "PARCIAL",
    "confianzaLLM": 0.82,
    "evidenciaTextual": "No menos importante, dicha institucionalidad debe poder crear los mecanismos de monitoreo, evaluación y rendición de cue",
    "justificacionLLM": "La política adopta elementos del análisis sobre Propuestas-para-un-mejor-futuro con un nivel de adopción parcial.",
    "iiiScoreFinal": 0.69,
    "fechaCalculo": "2025-03-12T10:00:00Z"
  },
  {
    "id": "imp-7",
    "pubId": "pub-7",
    "politicaId": "pol-5",
    "scoreTematico": 0.79,
    "diasDiferencia": 133,
    "pesoTemporal": 1.0,
    "nivelAdopcion": "TOTAL",
    "confianzaLLM": 0.9,
    "evidenciaTextual": "Según Bork (2021), uno de sus principales exponentes, esta legislación no debe verse como un medio de mejorar la distrib",
    "justificacionLLM": "La política adopta elementos del análisis sobre Hacia políticas públicas a favor de la c con un nivel de adopción total.",
    "iiiScoreFinal": 0.72,
    "fechaCalculo": "2025-03-18T10:00:00Z"
  },
  {
    "id": "imp-8",
    "pubId": "pub-8",
    "politicaId": "pol-3",
    "scoreTematico": 0.72,
    "diasDiferencia": 630,
    "pesoTemporal": 0.6,
    "nivelAdopcion": "PARCIAL",
    "confianzaLLM": 0.81,
    "evidenciaTextual": "Hoy, sacar adelante esta tarea debe ser la preocupación principal de quienes tienen en sus manos la responsabilidad de t",
    "justificacionLLM": "La política adopta elementos del análisis sobre Despues-de-la-pandemia_una-vision-de-lar con un nivel de adopción parcial.",
    "iiiScoreFinal": 0.7,
    "fechaCalculo": "2025-04-22T10:00:00Z"
  },
  {
    "id": "imp-9",
    "pubId": "pub-9",
    "politicaId": "pol-1",
    "scoreTematico": 0.67,
    "diasDiferencia": 383,
    "pesoTemporal": 1.0,
    "nivelAdopcion": "PARCIAL",
    "confianzaLLM": 0.76,
    "evidenciaTextual": "En segundo lugar, la reforma del régimen laboral, que se propone ubicar fuera del Régimen de Servicio Civil y el ámbito ",
    "justificacionLLM": "La política adopta elementos del análisis sobre Estudio sobre la implementación de la nu con un nivel de adopción parcial.",
    "iiiScoreFinal": 0.67,
    "fechaCalculo": "2025-07-09T10:00:00Z"
  },
  {
    "id": "imp-10",
    "pubId": "pub-10",
    "politicaId": "pol-10",
    "scoreTematico": 0.76,
    "diasDiferencia": 571,
    "pesoTemporal": 0.6,
    "nivelAdopcion": "TOTAL",
    "confianzaLLM": 0.84,
    "evidenciaTextual": "Vacío legal en gestión de residuos orgánicos Conclusión: existe un vacío legal con relación a la gestión de residuos org",
    "justificacionLLM": "La política adopta elementos del análisis sobre Transitando-a-la-circularidad con un nivel de adopción total.",
    "iiiScoreFinal": 0.73,
    "fechaCalculo": "2025-07-21T10:00:00Z"
  },
  {
    "id": "imp-11",
    "pubId": "pub-11",
    "politicaId": "pol-5",
    "scoreTematico": 0.73,
    "diasDiferencia": 611,
    "pesoTemporal": 0.6,
    "nivelAdopcion": "PARCIAL",
    "confianzaLLM": 0.87,
    "evidenciaTextual": "Para ello, debemos tener presente que el éxito no debe medirse necesariamente por inicios de obra o inauguraciones, sino",
    "justificacionLLM": "La política adopta elementos del análisis sobre Reciclaje de activos públicos con un nivel de adopción parcial.",
    "iiiScoreFinal": 0.65,
    "fechaCalculo": "2025-05-24T10:00:00Z"
  },
  {
    "id": "imp-12",
    "pubId": "pub-12",
    "politicaId": "pol-10",
    "scoreTematico": 0.7,
    "diasDiferencia": 201,
    "pesoTemporal": 1.0,
    "nivelAdopcion": "PARCIAL",
    "confianzaLLM": 0.77,
    "evidenciaTextual": "Hay que estar dispuesto a sudar.",
    "justificacionLLM": "La política adopta elementos del análisis sobre Acción Humana Eficaz con un nivel de adopción parcial.",
    "iiiScoreFinal": 0.68,
    "fechaCalculo": "2025-09-16T10:00:00Z"
  },
  {
    "id": "imp-13",
    "pubId": "pub-13",
    "politicaId": "pol-1",
    "scoreTematico": 0.73,
    "diasDiferencia": 223,
    "pesoTemporal": 1.0,
    "nivelAdopcion": "TOTAL",
    "confianzaLLM": 0.76,
    "evidenciaTextual": "El BCCR parece haber interpretado este mandato como una justificación para establecer comisiones máximas de intercambio ",
    "justificacionLLM": "La política adopta elementos del análisis sobre Regulacion-a-las-comisiones-de-tarjetas- con un nivel de adopción total.",
    "iiiScoreFinal": 0.72,
    "fechaCalculo": "2025-07-20T10:00:00Z"
  },
  {
    "id": "imp-14",
    "pubId": "pub-14",
    "politicaId": "pol-7",
    "scoreTematico": 0.73,
    "diasDiferencia": 317,
    "pesoTemporal": 1.0,
    "nivelAdopcion": "PARCIAL",
    "confianzaLLM": 0.94,
    "evidenciaTextual": "Costa Rica MATIC Convertirse en un “territorio MATIC” le őŅÁäŅĈÁ\u0003Á\u0003\u001dĩŉőÁ\u0003ĆÚÁ\u0003ġŗěőĆłěäŉ\u0003ÙäĢäƈÚĆĩŉ͠ \u0003ÁŅÁ\u0003 lograrlos, las",
    "justificacionLLM": "La política adopta elementos del análisis sobre 10 propuestas para mayor bienestar con un nivel de adopción parcial.",
    "iiiScoreFinal": 0.69,
    "fechaCalculo": "2025-09-28T10:00:00Z"
  },
  {
    "id": "imp-15",
    "pubId": "pub-15",
    "politicaId": "pol-2",
    "scoreTematico": 0.74,
    "diasDiferencia": 333,
    "pesoTemporal": 1.0,
    "nivelAdopcion": "PARCIAL",
    "confianzaLLM": 0.81,
    "evidenciaTextual": "Pero más tarde, con pausa, deben recorrerse las acciones que se efectuaron casi inconscientemente.",
    "justificacionLLM": "La política adopta elementos del análisis sobre Integridad_365 con un nivel de adopción parcial.",
    "iiiScoreFinal": 0.69,
    "fechaCalculo": "2025-06-04T10:00:00Z"
  },
  {
    "id": "imp-16",
    "pubId": "pub-16",
    "politicaId": "pol-3",
    "scoreTematico": 0.76,
    "diasDiferencia": 329,
    "pesoTemporal": 1.0,
    "nivelAdopcion": "PARCIAL",
    "confianzaLLM": 0.79,
    "evidenciaTextual": "I y II Trimestre del 2020 Cuadro 7 Flujo de movilidad de la población ocupada del sector de Servicios.",
    "justificacionLLM": "La política adopta elementos del análisis sobre Desempleo, pobreza y desigualdad en Cost con un nivel de adopción parcial.",
    "iiiScoreFinal": 0.67,
    "fechaCalculo": "2025-09-25T10:00:00Z"
  },
  {
    "id": "imp-17",
    "pubId": "pub-17",
    "politicaId": "pol-2",
    "scoreTematico": 0.73,
    "diasDiferencia": 579,
    "pesoTemporal": 0.6,
    "nivelAdopcion": "PARCIAL",
    "confianzaLLM": 0.82,
    "evidenciaTextual": "Importancia y beneficios de la competencia Para que exista competencia es necesario que los diversos grupos económicos o",
    "justificacionLLM": "La política adopta elementos del análisis sobre Promoción-de-la-competencia-en-benefici con un nivel de adopción parcial.",
    "iiiScoreFinal": 0.7,
    "fechaCalculo": "2025-04-05T10:00:00Z"
  },
  {
    "id": "imp-18",
    "pubId": "pub-18",
    "politicaId": "pol-3",
    "scoreTematico": 0.74,
    "diasDiferencia": 603,
    "pesoTemporal": 0.6,
    "nivelAdopcion": "PARCIAL",
    "confianzaLLM": 0.81,
    "evidenciaTextual": "En la sección 4 se comentan los resultados de las estimaciones de los impactos de la política generada a partir de la nu",
    "justificacionLLM": "La política adopta elementos del análisis sobre El-efecto-de-la-regulacion-sobre-comisio con un nivel de adopción parcial.",
    "iiiScoreFinal": 0.66,
    "fechaCalculo": "2025-01-20T10:00:00Z"
  },
  {
    "id": "imp-19",
    "pubId": "pub-19",
    "politicaId": "pol-1",
    "scoreTematico": 0.65,
    "diasDiferencia": 374,
    "pesoTemporal": 1.0,
    "nivelAdopcion": "PARCIAL",
    "confianzaLLM": 0.8,
    "evidenciaTextual": "Esto de debe a que las encuestas de empleo suelen describir la estructura actual del empleo y por ello omiten la posibil",
    "justificacionLLM": "La política adopta elementos del análisis sobre brechas-capital-humano-profesional con un nivel de adopción parcial.",
    "iiiScoreFinal": 0.62,
    "fechaCalculo": "2025-04-02T10:00:00Z"
  },
  {
    "id": "imp-20",
    "pubId": "pub-20",
    "politicaId": "pol-10",
    "scoreTematico": 0.71,
    "diasDiferencia": 557,
    "pesoTemporal": 0.6,
    "nivelAdopcion": "PARCIAL",
    "confianzaLLM": 0.86,
    "evidenciaTextual": "Entre los antecedentes ideológicos del período estudiado hay que considerar el auge del liberalismo en Europa y los Esta",
    "justificacionLLM": "La política adopta elementos del análisis sobre Ideas-y-personajes-de-Costa-Rica-durante con un nivel de adopción parcial.",
    "iiiScoreFinal": 0.7,
    "fechaCalculo": "2025-02-25T10:00:00Z"
  }
];
export const actasLegislativas: ActaLegislativa[] = [
  {
    "id": "act-1",
    "numeroExpediente": "22.231-PL",
    "fecha": "2025-08-18",
    "tipoEvento": "Audiencia Pública",
    "textoTranscripcion": "En el marco de la discusión del expediente, expertos de la Academia de Centroamérica presentaron análisis técnico sobre la materia, con base en investigaciones recientes del Comité de Investigación.",
    "institucionId": "ins-1"
  },
  {
    "id": "act-2",
    "numeroExpediente": "23.640-PL",
    "fecha": "2025-07-07",
    "tipoEvento": "Debate Plenario",
    "textoTranscripcion": "En el marco de la discusión del expediente, expertos de la Academia de Centroamérica presentaron análisis técnico sobre la materia, con base en investigaciones recientes del Comité de Investigación.",
    "institucionId": "ins-1"
  },
  {
    "id": "act-3",
    "numeroExpediente": "24.806-PL",
    "fecha": "2025-04-23",
    "tipoEvento": "Comisión",
    "textoTranscripcion": "En el marco de la discusión del expediente, expertos de la Academia de Centroamérica presentaron análisis técnico sobre la materia, con base en investigaciones recientes del Comité de Investigación.",
    "institucionId": "ins-1"
  },
  {
    "id": "act-4",
    "numeroExpediente": "23.787-PL",
    "fecha": "2025-06-15",
    "tipoEvento": "Debate Plenario",
    "textoTranscripcion": "En el marco de la discusión del expediente, expertos de la Academia de Centroamérica presentaron análisis técnico sobre la materia, con base en investigaciones recientes del Comité de Investigación.",
    "institucionId": "ins-1"
  },
  {
    "id": "act-5",
    "numeroExpediente": "23.223-PL",
    "fecha": "2025-04-08",
    "tipoEvento": "Audiencia Pública",
    "textoTranscripcion": "En el marco de la discusión del expediente, expertos de la Academia de Centroamérica presentaron análisis técnico sobre la materia, con base en investigaciones recientes del Comité de Investigación.",
    "institucionId": "ins-1"
  }
];
export const mencionesMedios: MencionMedio[] = [
  {
    "id": "men-1",
    "medioId": "med-1",
    "fecha": "2025-06-01",
    "url": "https://example.com",
    "titular": "Propuesta técnica recibe respaldo de sectores",
    "textoArticulo": "Cobertura periodística del análisis de la Academia de Centroamérica sobre políticas públicas.",
    "sentimiento": "Neutro"
  },
  {
    "id": "men-2",
    "medioId": "med-2",
    "fecha": "2025-04-01",
    "url": "https://example.com",
    "titular": "Hacienda presenta plan inspirado en propuestas académicas",
    "textoArticulo": "Cobertura periodística del análisis de la Academia de Centroamérica sobre políticas públicas.",
    "sentimiento": "Neutro"
  },
  {
    "id": "men-3",
    "medioId": "med-3",
    "fecha": "2025-01-08",
    "url": "https://example.com",
    "titular": "Hacienda presenta plan inspirado en propuestas académicas",
    "textoArticulo": "Cobertura periodística del análisis de la Academia de Centroamérica sobre políticas públicas.",
    "sentimiento": "Negativo"
  },
  {
    "id": "men-4",
    "medioId": "med-4",
    "fecha": "2025-06-03",
    "url": "https://example.com",
    "titular": "Costa Rica busca oportunidades en el contexto internacional",
    "textoArticulo": "Cobertura periodística del análisis de la Academia de Centroamérica sobre políticas públicas.",
    "sentimiento": "Positivo"
  },
  {
    "id": "men-5",
    "medioId": "med-5",
    "fecha": "2025-08-07",
    "url": "https://example.com",
    "titular": "Costa Rica busca oportunidades en el contexto internacional",
    "textoArticulo": "Cobertura periodística del análisis de la Academia de Centroamérica sobre políticas públicas.",
    "sentimiento": "Positivo"
  },
  {
    "id": "men-6",
    "medioId": "med-6",
    "fecha": "2025-08-08",
    "url": "https://example.com",
    "titular": "Academia advierte sobre riesgos de la política actual",
    "textoArticulo": "Cobertura periodística del análisis de la Academia de Centroamérica sobre políticas públicas.",
    "sentimiento": "Negativo"
  },
  {
    "id": "men-7",
    "medioId": "med-7",
    "fecha": "2025-04-04",
    "url": "https://example.com",
    "titular": "Hacienda presenta plan inspirado en propuestas académicas",
    "textoArticulo": "Cobertura periodística del análisis de la Academia de Centroamérica sobre políticas públicas.",
    "sentimiento": "Neutro"
  },
  {
    "id": "men-8",
    "medioId": "med-8",
    "fecha": "2025-06-14",
    "url": "https://example.com",
    "titular": "Datos abiertos: nueva plataforma gubernamental",
    "textoArticulo": "Cobertura periodística del análisis de la Academia de Centroamérica sobre políticas públicas.",
    "sentimiento": "Positivo"
  },
  {
    "id": "men-9",
    "medioId": "med-1",
    "fecha": "2025-01-22",
    "url": "https://example.com",
    "titular": "Hacienda presenta plan inspirado en propuestas académicas",
    "textoArticulo": "Cobertura periodística del análisis de la Academia de Centroamérica sobre políticas públicas.",
    "sentimiento": "Positivo"
  },
  {
    "id": "men-10",
    "medioId": "med-2",
    "fecha": "2025-06-26",
    "url": "https://example.com",
    "titular": "Hacienda presenta plan inspirado en propuestas académicas",
    "textoArticulo": "Cobertura periodística del análisis de la Academia de Centroamérica sobre políticas públicas.",
    "sentimiento": "Positivo"
  }
];
export const impactoICIPolitico: ImpactoICIPolitico[] = [
  {
    "id": "icip-1",
    "pubId": "pub-1",
    "actaId": "act-1",
    "tipoInteraccion": "Participación en Audiencia",
    "fragmentoCita": "Expert de la ACA presentó análisis ante la comisión legislativa...",
    "fechaRegistro": "2025-02-15"
  },
  {
    "id": "icip-2",
    "pubId": "pub-2",
    "actaId": "act-2",
    "tipoInteraccion": "Insumo Técnico",
    "fragmentoCita": "Expert de la ACA presentó análisis ante la comisión legislativa...",
    "fechaRegistro": "2025-03-15"
  },
  {
    "id": "icip-3",
    "pubId": "pub-3",
    "actaId": "act-3",
    "tipoInteraccion": "Citación Directa",
    "fragmentoCita": "Expert de la ACA presentó análisis ante la comisión legislativa...",
    "fechaRegistro": "2025-04-15"
  },
  {
    "id": "icip-4",
    "pubId": "pub-4",
    "actaId": "act-4",
    "tipoInteraccion": "Participación en Audiencia",
    "fragmentoCita": "Expert de la ACA presentó análisis ante la comisión legislativa...",
    "fechaRegistro": "2025-05-15"
  },
  {
    "id": "icip-5",
    "pubId": "pub-5",
    "actaId": "act-5",
    "tipoInteraccion": "Insumo Técnico",
    "fragmentoCita": "Expert de la ACA presentó análisis ante la comisión legislativa...",
    "fechaRegistro": "2025-06-15"
  }
];
export const impactoICIMedios: ImpactoICIMedios[] = [
  {
    "id": "icim-1",
    "pubId": "pub-7",
    "mencionId": "men-1",
    "tipoMencion": "Opinión basada en datos ACA",
    "fechaRegistro": "2025-06-01"
  },
  {
    "id": "icim-2",
    "pubId": "pub-15",
    "mencionId": "men-2",
    "tipoMencion": "Autor citado",
    "fechaRegistro": "2025-04-01"
  },
  {
    "id": "icim-3",
    "pubId": "pub-14",
    "mencionId": "men-3",
    "tipoMencion": "Autor citado",
    "fechaRegistro": "2025-01-08"
  },
  {
    "id": "icim-4",
    "pubId": "pub-9",
    "mencionId": "men-4",
    "tipoMencion": "Paper mencionado",
    "fechaRegistro": "2025-06-03"
  },
  {
    "id": "icim-5",
    "pubId": "pub-8",
    "mencionId": "men-5",
    "tipoMencion": "Autor citado",
    "fechaRegistro": "2025-08-07"
  },
  {
    "id": "icim-6",
    "pubId": "pub-15",
    "mencionId": "men-6",
    "tipoMencion": "Opinión basada en datos ACA",
    "fechaRegistro": "2025-08-08"
  },
  {
    "id": "icim-7",
    "pubId": "pub-4",
    "mencionId": "men-7",
    "tipoMencion": "Autor citado",
    "fechaRegistro": "2025-04-04"
  },
  {
    "id": "icim-8",
    "pubId": "pub-21",
    "mencionId": "men-8",
    "tipoMencion": "Opinión basada en datos ACA",
    "fechaRegistro": "2025-06-14"
  },
  {
    "id": "icim-9",
    "pubId": "pub-27",
    "mencionId": "men-9",
    "tipoMencion": "Autor citado",
    "fechaRegistro": "2025-01-22"
  },
  {
    "id": "icim-10",
    "pubId": "pub-3",
    "mencionId": "men-10",
    "tipoMencion": "Autor citado",
    "fechaRegistro": "2025-06-26"
  }
];
export const audits: AuditResult[] = [
  {
    "id": "aud-1",
    "pubId": "pub-1",
    "politicaId": "pol-7",
    "status": "Completado",
    "resultado": {
      "nivelAdopcion": "PARCIAL",
      "puntuacionConfianza": 0.83,
      "evidenciaTextual": "Asimismo, se debería evaluar la posibilidad de diseñar o adaptar incentivos para atraer flujos de IED más propensos a de",
      "justificacion": "La política adopta elementos del análisis sobre CGV_Encadenamientos_Derrames con un nivel de adopción parcial."
    },
    "fechaInicio": "2025-03-23T10:00:00Z",
    "fechaCompletado": "2025-03-23T10:00:00Z"
  },
  {
    "id": "aud-2",
    "pubId": "pub-2",
    "politicaId": "pol-5",
    "status": "Completado",
    "resultado": {
      "nivelAdopcion": "PARCIAL",
      "puntuacionConfianza": 0.83,
      "evidenciaTextual": "Si bien las políticas de acompañamiento a las MIPYMES buscan construir una estructura coherente y progresiva de ayudas p",
      "justificacion": "La política adopta elementos del análisis sobre Fortaleciendo-el-Ecosistema-Emprendedor- con un nivel de adopción parcial."
    },
    "fechaInicio": "2025-02-03T10:00:00Z",
    "fechaCompletado": "2025-02-03T10:00:00Z"
  },
  {
    "id": "aud-3",
    "pubId": "pub-3",
    "politicaId": "pol-6",
    "status": "Completado",
    "resultado": {
      "nivelAdopcion": "TOTAL",
      "puntuacionConfianza": 0.77,
      "evidenciaTextual": "Reforzar la institucionalidad fiscal con el objetivo de mejorar la credibilidad de la política fiscal La política moneta",
      "justificacion": "La política adopta elementos del análisis sobre 20_Politica-fiscal-en-Costa-Rica-2021 con un nivel de adopción total."
    },
    "fechaInicio": "2025-08-18T10:00:00Z",
    "fechaCompletado": "2025-08-18T10:00:00Z"
  },
  {
    "id": "aud-4",
    "pubId": "pub-4",
    "politicaId": "pol-7",
    "status": "Completado",
    "resultado": {
      "nivelAdopcion": "PARCIAL",
      "puntuacionConfianza": 0.79,
      "evidenciaTextual": "En ese sentido, se recomienda explorar fuentes alternativas de financiamiento para la seguridad social.",
      "justificacion": "La política adopta elementos del análisis sobre Cargas-sobre-el-trabajo-parafiscalidad-y con un nivel de adopción parcial."
    },
    "fechaInicio": "2025-06-19T10:00:00Z",
    "fechaCompletado": "2025-06-19T10:00:00Z"
  },
  {
    "id": "aud-5",
    "pubId": "pub-5",
    "politicaId": "pol-2",
    "status": "En progreso",
    "resultado": null,
    "fechaInicio": "2025-02-28T10:00:00Z",
    "fechaCompletado": null
  }
];
export const monthlyTrends: MonthlyTrend[] = [
  {
    "month": "Ene",
    "iiiScore": 57,
    "iciPolitico": 15,
    "iciMedios": 21
  },
  {
    "month": "Feb",
    "iiiScore": 61,
    "iciPolitico": 15,
    "iciMedios": 22
  },
  {
    "month": "Mar",
    "iiiScore": 60,
    "iciPolitico": 17,
    "iciMedios": 23
  },
  {
    "month": "Abr",
    "iiiScore": 62,
    "iciPolitico": 21,
    "iciMedios": 23
  },
  {
    "month": "May",
    "iiiScore": 67,
    "iciPolitico": 22,
    "iciMedios": 25
  },
  {
    "month": "Jun",
    "iiiScore": 70,
    "iciPolitico": 25,
    "iciMedios": 24
  }
];
export const themeImpacts: ThemeImpact[] = [
  {
    "temaId": "tem-8",
    "temaNombre": "Salud",
    "iiiScore": 71,
    "pubCount": 1
  },
  {
    "temaId": "tem-5",
    "temaNombre": "Medio Ambiente",
    "iiiScore": 69,
    "pubCount": 4
  },
  {
    "temaId": "tem-3",
    "temaNombre": "Educación",
    "iiiScore": 68,
    "pubCount": 2
  },
  {
    "temaId": "tem-7",
    "temaNombre": "Comercio Exterior",
    "iiiScore": 68,
    "pubCount": 4
  },
  {
    "temaId": "tem-6",
    "temaNombre": "Gobernabilidad",
    "iiiScore": 66,
    "pubCount": 3
  },
  {
    "temaId": "tem-4",
    "temaNombre": "Empleo",
    "iiiScore": 65,
    "pubCount": 4
  },
  {
    "temaId": "tem-1",
    "temaNombre": "Política Fiscal",
    "iiiScore": 64,
    "pubCount": 11
  },
  {
    "temaId": "tem-2",
    "temaNombre": "Seguridad Social",
    "iiiScore": 50,
    "pubCount": 0
  }
];
export const kpiData: KPIData[] = [
  {
    "label": "III PROMEDIO GLOBAL",
    "value": "66.1%",
    "context": "corpus ACA · 29 publicaciones",
    "trend": "up",
    "accentColor": "#2E4A62"
  },
  {
    "label": "PUBLICACIONES MONITOREADAS",
    "value": "29",
    "context": "741 propuestas extraídas",
    "trend": "neutral",
    "accentColor": "#1E7A5F"
  },
  {
    "label": "POLÍTICAS VINCULADAS",
    "value": "7",
    "context": "20 vínculos documentados",
    "trend": "up",
    "accentColor": "#1E7A5F"
  },
  {
    "label": "COBERTURA MEDIÁTICA",
    "value": "10",
    "context": "menciones en medios nacionales",
    "trend": "up",
    "accentColor": "#1E7A5F"
  }
];
export const channelData = [
  {
    "name": "ICI-Político",
    "value": 62,
    "color": "#2E4A62",
    "count": 5
  },
  {
    "name": "ICI-Medios",
    "value": 38,
    "color": "#3A8B8C",
    "count": 10
  }
];
export const mediaOutletData = [
  {
    "name": "La Nación",
    "menciones": 24
  },
  {
    "name": "CRHoy",
    "menciones": 30
  },
  {
    "name": "Semanario Universidad",
    "menciones": 25
  },
  {
    "name": "El Financiero",
    "menciones": 15
  },
  {
    "name": "Teletica",
    "menciones": 15
  },
  {
    "name": "La República",
    "menciones": 32
  },
  {
    "name": "Amelia Rueda",
    "menciones": 15
  },
  {
    "name": "La Teja",
    "menciones": 15
  }
];
