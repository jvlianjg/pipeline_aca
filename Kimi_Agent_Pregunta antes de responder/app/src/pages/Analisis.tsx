import { useState } from 'react';
import { motion } from 'framer-motion';
import { publicaciones, impactosIII, politicasPublicas, autores, instituciones, temas } from '@/data/mockData';
import ProgressBar from '@/components/ProgressBar';
import { AdopcionBadge } from '@/components/Badge';
import { Search, Filter, ArrowLeftRight } from 'lucide-react';

type FilterType = 'todos' | 'alto' | 'medio' | 'bajo';

function getAutorName(id: string) { return autores.find(a => a.id === id)?.nombre || id; }
function getInstitucionName(id: string) { return instituciones.find(i => i.id === id)?.nombre || id; }
function getTemaName(id: string) { return temas.find(t => t.id === id)?.nombre || id; }

const scoreColor = (score: number) => score >= 0.7 ? '#1E7A5F' : score >= 0.4 ? '#D4953A' : '#C4523A';

export default function Analisis() {
  const [selectedPub, setSelectedPub] = useState(publicaciones[0]);
  const [filter, setFilter] = useState<FilterType>('todos');
  const [search, setSearch] = useState('');

  const filteredPubs = publicaciones.filter(p => {
    if (search && !p.titulo.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'todos') return true;
    const impacts = impactosIII.filter(i => i.pubId === p.id);
    const maxScore = impacts.length > 0 ? Math.max(...impacts.map(i => i.iiiScoreFinal)) : 0;
    if (filter === 'alto') return maxScore >= 0.7;
    if (filter === 'medio') return maxScore >= 0.4 && maxScore < 0.7;
    if (filter === 'bajo') return maxScore < 0.4;
    return true;
  });

  const selectedImpacts = impactosIII.filter(i => i.pubId === selectedPub.id);

  return (
    <div className="pt-16 min-h-screen" style={{ background: '#F7F7F5' }}>
      <div className="max-w-[1440px] mx-auto px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-[40px] leading-[48px] tracking-[-0.4px] text-[#1A1D23]" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Análisis de Impacto de Ideas
          </h1>
          <p className="text-[14px] text-[#5C6370] mt-1">
            Evaluación de alineación semántica entre publicaciones ACA y políticas públicas
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[240px] max-w-[400px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9BA3B0]" />
            <input
              type="text"
              placeholder="Buscar publicaciones..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-[14px] text-[#1A1D23] placeholder:text-[#9BA3B0] focus:outline-none focus:ring-2 focus:ring-[#2E4A62]/20 focus:border-[#2E4A62]"
            />
          </div>
          <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-lg p-1">
            {([['todos', 'Todos'], ['alto', 'Alto Impacto'], ['medio', 'Impacto Medio'], ['bajo', 'Bajo Impacto']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-md text-[13px] font-medium transition-colors ${
                  filter === key ? 'bg-[#2E4A62] text-white' : 'text-[#5C6370] hover:bg-[#F0F1F4]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Publication List */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-white rounded-xl border border-[#E5E7EB] overflow-hidden"
          >
            <div className="p-4 border-b border-[#F0F1F4]">
              <h3 className="text-[16px] font-medium text-[#1A1D23]">Publicaciones ({filteredPubs.length})</h3>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {filteredPubs.map(pub => {
                const impacts = impactosIII.filter(i => i.pubId === pub.id);
                const maxScore = impacts.length > 0 ? Math.max(...impacts.map(i => i.iiiScoreFinal)) : 0;
                const isSelected = selectedPub.id === pub.id;
                return (
                  <button
                    key={pub.id}
                    onClick={() => setSelectedPub(pub)}
                    className={`w-full text-left p-4 border-b border-[#F0F1F4] transition-colors ${
                      isSelected ? 'bg-[#2E4A62]/5 border-l-[3px] border-l-[#2E4A62]' : 'hover:bg-[#FAFAF8] border-l-[3px] border-l-transparent'
                    }`}
                  >
                    <h4 className="text-[14px] font-medium text-[#1A1D23] line-clamp-2 mb-1">{pub.titulo}</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-[#5C6370]">{getAutorName(pub.autorId)} · {getTemaName(pub.temaId)}</span>
                      {maxScore > 0 && (
                        <span className="text-[12px] font-medium" style={{ color: scoreColor(maxScore) }}>
                          {(maxScore * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Detail Panel */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-3 space-y-4"
          >
            {/* Publication Detail */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="inline-block px-2.5 py-1 bg-[#2E4A62]/10 text-[#2E4A62] text-[12px] font-medium rounded-full mb-2">
                    {getTemaName(selectedPub.temaId)}
                  </span>
                  <h2 className="text-[24px] leading-[32px] tracking-[-0.24px] text-[#1A1D23]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                    {selectedPub.titulo}
                  </h2>
                  <p className="text-[13px] text-[#5C6370] mt-1">
                    {getAutorName(selectedPub.autorId)} · {new Date(selectedPub.fechaPublicacion).toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <p className="text-[14px] leading-[24px] text-[#5C6370] bg-[#FAFAF8] rounded-lg p-4 border border-[#F0F1F4]">
                {selectedPub.excerpt}
              </p>
            </div>

            {/* Impact Results */}
            {selectedImpacts.map(imp => {
              const pol = politicasPublicas.find(p => p.id === imp.politicaId);
              if (!pol) return null;
              return (
                <div key={imp.id} className="bg-white rounded-xl border border-[#E5E7EB] p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ArrowLeftRight className="w-4 h-4 text-[#2E4A62]" />
                    <h3 className="text-[18px] font-medium text-[#1A1D23]">Coincidencia de Política</h3>
                  </div>

                  <div className="bg-[#FAFAF8] rounded-lg p-4 border border-[#F0F1F4] mb-4">
                    <p className="text-[14px] font-medium text-[#1A1D23] mb-1">{pol.nombre}</p>
                    <p className="text-[12px] text-[#5C6370]">{getInstitucionName(pol.institucionId)} · {new Date(pol.fechaEmision).toLocaleDateString('es-CR')}</p>
                  </div>

                  {/* III Breakdown */}
                  <div className="space-y-4 mb-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[14px] font-medium text-[#1A1D23]">Alineación Temática</span>
                        <span className="text-[13px] font-medium text-[#2E4A62]">{(imp.scoreTematico * 100).toFixed(0)}%</span>
                      </div>
                      <ProgressBar value={imp.scoreTematico * 100} color="#2E4A62" height={6} showLabel={false} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[14px] font-medium text-[#1A1D23]">Temporalidad</span>
                        <span className="text-[13px] font-medium text-[#1E7A5F]">{imp.pesoTemporal === 1.0 ? 'Ventana óptima' : 'Impacto tardío'}</span>
                      </div>
                      <ProgressBar value={imp.pesoTemporal * 100} color="#1E7A5F" height={6} showLabel={false} />
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#F0F1F4]">
                      <span className="text-[14px] font-medium text-[#1A1D23]">Nivel de Adopción</span>
                      <AdopcionBadge level={imp.nivelAdopcion} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-medium text-[#1A1D23]">Confianza del Auditor</span>
                      <span className="text-[13px] font-medium text-[#2E4A62]">{(imp.confianzaLLM * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  {/* Final Score */}
                  <div className="bg-[#1E7A5F]/5 rounded-lg p-4 border border-[#1E7A5F]/20">
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-medium text-[#1A1D23]">Score III Final</span>
                      <span className="text-[32px] leading-[36px] tracking-[-0.32px] text-[#1E7A5F]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                        {(imp.iiiScoreFinal * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-[13px] text-[#5C6370] mt-2">{imp.justificacionLLM}</p>
                  </div>

                  {imp.evidenciaTextual && imp.evidenciaTextual !== 'N/A' && (
                    <div className="mt-4 bg-[#D4953A]/5 rounded-lg p-4 border border-[#D4953A]/20">
                      <p className="text-[12px] font-medium uppercase tracking-[0.12px] text-[#D4953A] mb-2">Evidencia Textual</p>
                      <p className="text-[14px] italic text-[#5C6370] leading-[22px]">"{imp.evidenciaTextual}"</p>
                    </div>
                  )}
                </div>
              );
            })}

            {selectedImpacts.length === 0 && (
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
                <Filter className="w-8 h-8 text-[#9BA3B0] mx-auto mb-3" />
                <p className="text-[16px] font-medium text-[#5C6370]">Sin coincidencias registradas</p>
                <p className="text-[13px] text-[#9BA3B0] mt-1">Esta publicación aún no tiene políticas vinculadas</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
