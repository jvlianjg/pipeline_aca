export interface Autor {
  id: string;
  nombre: string;
  tipo: 'Research Fellow' | 'Asociado' | 'Institucional';
}

export interface Tema {
  id: string;
  nombre: string;
  descripcion: string;
}

export interface Institucion {
  id: string;
  nombre: string;
  sector: string;
}

export interface Medio {
  id: string;
  nombre: string;
  tipo: 'Prensa Escrita' | 'Digital' | 'Televisión';
  alcance: 'Nacional' | 'Regional' | 'Especializado';
}

export interface Publicacion {
  id: string;
  titulo: string;
  fechaPublicacion: string;
  autorId: string;
  temaId: string;
  textoLimpio: string;
  excerpt: string;
}

export interface PoliticaPublica {
  id: string;
  nombre: string;
  institucionId: string;
  fechaEmision: string;
  textoLimpio: string;
  excerpt: string;
}

export interface ImpactoIII {
  id: string;
  pubId: string;
  politicaId: string;
  scoreTematico: number;
  diasDiferencia: number;
  pesoTemporal: number;
  nivelAdopcion: 'NULA' | 'SUPERFICIAL' | 'PARCIAL' | 'TOTAL';
  confianzaLLM: number;
  evidenciaTextual: string;
  justificacionLLM: string;
  iiiScoreFinal: number;
  fechaCalculo: string;
}

export interface ActaLegislativa {
  id: string;
  numeroExpediente: string;
  fecha: string;
  tipoEvento: 'Audiencia Pública' | 'Debate Plenario' | 'Comisión';
  textoTranscripcion: string;
  institucionId: string;
}

export interface MencionMedio {
  id: string;
  medioId: string;
  fecha: string;
  url: string;
  titular: string;
  textoArticulo: string;
  sentimiento: 'Positivo' | 'Neutro' | 'Negativo';
}

export interface ImpactoICIPolitico {
  id: string;
  pubId: string;
  actaId: string;
  tipoInteraccion: 'Citación Directa' | 'Participación en Audiencia' | 'Insumo Técnico';
  fragmentoCita: string;
  fechaRegistro: string;
}

export interface ImpactoICIMedios {
  id: string;
  pubId: string | null;
  mencionId: string;
  tipoMencion: 'Autor citado' | 'Paper mencionado' | 'Opinión basada en datos ACA';
  fechaRegistro: string;
}

export interface AuditResult {
  id: string;
  pubId: string;
  politicaId: string;
  status: 'Pendiente' | 'En progreso' | 'Completado';
  resultado: {
    nivelAdopcion: 'NULA' | 'SUPERFICIAL' | 'PARCIAL' | 'TOTAL';
    puntuacionConfianza: number;
    evidenciaTextual: string;
    justificacion: string;
  } | null;
  fechaInicio: string;
  fechaCompletado?: string;
}

export interface MonthlyTrend {
  month: string;
  iiiScore: number;
  iciPolitico: number;
  iciMedios: number;
}

export interface ThemeImpact {
  temaId: string;
  temaNombre: string;
  iiiScore: number;
  pubCount: number;
}

export interface KPIData {
  label: string;
  value: string;
  context: string;
  trend: 'up' | 'down' | 'neutral';
  accentColor: string;
}
