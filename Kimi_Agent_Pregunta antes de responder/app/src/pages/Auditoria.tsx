import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { audits, publicaciones, politicasPublicas, instituciones } from '@/data/mockData';
import { StatusBadge } from '@/components/Badge';
import { FileSearch, Clock, CheckCircle2, AlertCircle, X, Sparkles, ChevronRight } from 'lucide-react';
import type { AuditResult } from '@/types';

function getInstitucionName(id: string) { return instituciones.find(i => i.id === id)?.nombre || id; }

const statusIcons: Record<string, React.ReactNode> = {
  'Completado': <CheckCircle2 className="w-5 h-5 text-[#1E7A5F]" />,
  'En progreso': <Clock className="w-5 h-5 text-[#D4953A]" />,
  'Pendiente': <AlertCircle className="w-5 h-5 text-[#9BA3B0]" />,
};

export default function Auditoria() {
  const [selectedAudit, setSelectedAudit] = useState<AuditResult | null>(null);

  return (
    <div className="pt-16 min-h-screen" style={{ background: '#F7F7F5' }}>
      <div className="max-w-[1440px] mx-auto px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[40px] leading-[48px] tracking-[-0.4px] text-[#1A1D23]" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Auditoría de Adopción
            </h1>
            <p className="text-[14px] text-[#5C6370] mt-1">
              Resultados de auditoría automática por Inteligencia Artificial
            </p>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-[#2E4A62] text-white rounded-lg text-[14px] font-medium hover:bg-[#243a4e] transition-colors">
            <Sparkles className="w-4 h-4" /> Nueva Auditoría
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Audit List */}
          <div className="lg:col-span-2 space-y-4">
            {audits.map((audit, i) => {
              const pub = publicaciones.find(p => p.id === audit.pubId);
              const pol = politicasPublicas.find(p => p.id === audit.politicaId);
              if (!pub || !pol) return null;

              return (
                <motion.div
                  key={audit.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => setSelectedAudit(audit)}
                  className={`bg-white rounded-xl border p-6 cursor-pointer transition-all hover:shadow-md ${
                    selectedAudit?.id === audit.id ? 'border-[#2E4A62] shadow-md' : 'border-[#E5E7EB]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {statusIcons[audit.status]}
                      <div>
                        <StatusBadge status={audit.status} />
                      </div>
                    </div>
                    <span className="text-[12px] text-[#9BA3B0]">
                      {new Date(audit.fechaInicio).toLocaleDateString('es-CR', { day: 'numeric', month: 'long' })}
                    </span>
                  </div>

                  <h3 className="text-[16px] font-medium text-[#1A1D23] mb-2 line-clamp-2">{pub.titulo}</h3>
                  <p className="text-[13px] text-[#5C6370] mb-4">
                    vs <span className="font-medium text-[#1A1D23]">{pol.nombre}</span> — {getInstitucionName(pol.institucionId)}
                  </p>

                  {audit.resultado && (
                    <div className="flex items-center gap-4 pt-4 border-t border-[#F0F1F4]">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[#5C6370]">Adopción:</span>
                        <span className={`text-[13px] font-medium ${
                          audit.resultado.nivelAdopcion === 'TOTAL' ? 'text-[#1E7A5F]' :
                          audit.resultado.nivelAdopcion === 'PARCIAL' ? 'text-[#D4953A]' :
                          audit.resultado.nivelAdopcion === 'SUPERFICIAL' ? 'text-[#5C6370]' : 'text-[#C4523A]'
                        }`}>
                          {audit.resultado.nivelAdopcion}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[#5C6370]">Confianza:</span>
                        <span className="text-[13px] font-medium text-[#2E4A62]">
                          {(audit.resultado.puntuacionConfianza * 100).toFixed(0)}%
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#9BA3B0] ml-auto" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-1">
            <AnimatePresence mode="wait">
              {selectedAudit && selectedAudit.resultado ? (
                <motion.div
                  key={selectedAudit.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white rounded-xl border border-[#E5E7EB] p-6 sticky top-20"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[18px] font-medium text-[#1A1D23]">Resultado del Auditor</h3>
                    <button onClick={() => setSelectedAudit(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F0F1F4]">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Adopcion Level */}
                  <div className="mb-6">
                    <p className="text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0] mb-3">Nivel de Adopción</p>
                    <div className={`inline-flex items-center px-5 py-3 rounded-xl text-[24px] font-medium ${
                      selectedAudit.resultado.nivelAdopcion === 'TOTAL' ? 'bg-[#1E7A5F]/10 text-[#1E7A5F]' :
                      selectedAudit.resultado.nivelAdopcion === 'PARCIAL' ? 'bg-[#D4953A]/10 text-[#D4953A]' :
                      selectedAudit.resultado.nivelAdopcion === 'SUPERFICIAL' ? 'bg-[#F0F1F4] text-[#5C6370]' :
                      'bg-[#C4523A]/10 text-[#C4523A]'
                    }`}>
                      {selectedAudit.resultado.nivelAdopcion}
                    </div>
                  </div>

                  {/* Confidence Gauge */}
                  <div className="mb-6">
                    <p className="text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0] mb-3">Confianza del Análisis</p>
                    <div className="relative h-4 bg-[#F0F1F4] rounded-full overflow-hidden mb-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${selectedAudit.resultado.puntuacionConfianza * 100}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="absolute left-0 top-0 bottom-0 rounded-full"
                        style={{
                          background: `linear-gradient(90deg, #C4523A 0%, #D4953A 50%, #1E7A5F 100%)`,
                        }}
                      />
                    </div>
                    <p className="text-[28px] leading-[32px] text-[#1A1D23]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                      {(selectedAudit.resultado.puntuacionConfianza * 100).toFixed(1)}%
                    </p>
                  </div>

                  {/* Evidencia Textual */}
                  {selectedAudit.resultado.evidenciaTextual && selectedAudit.resultado.evidenciaTextual !== 'N/A' && (
                    <div className="mb-6">
                      <p className="text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0] mb-3">Evidencia Textual</p>
                      <div className="bg-[#FAFAF8] rounded-lg p-4 border border-[#F0F1F4]">
                        <p className="text-[14px] italic text-[#5C6370] leading-[22px]">"{selectedAudit.resultado.evidenciaTextual}"</p>
                      </div>
                    </div>
                  )}

                  {/* Justificacion */}
                  <div>
                    <p className="text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0] mb-3">Justificación del Auditor</p>
                    <p className="text-[14px] text-[#5C6370] leading-[24px]">{selectedAudit.resultado.justificacion}</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center sticky top-20"
                >
                  <FileSearch className="w-10 h-10 text-[#9BA3B0] mx-auto mb-4" />
                  <p className="text-[16px] font-medium text-[#5C6370]">Selecciona una auditoría</p>
                  <p className="text-[13px] text-[#9BA3B0] mt-1">Haz clic en una tarjeta para ver los detalles del análisis</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
