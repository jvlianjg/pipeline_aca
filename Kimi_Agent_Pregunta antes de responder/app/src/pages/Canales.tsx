import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { actasLegislativas, impactoICIPolitico, mencionesMedios, impactoICIMedios, instituciones, medios, publicaciones, mediaOutletData } from '@/data/mockData';
import { Building2, Newspaper, TrendingUp, Users, Eye, MessageSquare } from 'lucide-react';

type Tab = 'politico' | 'medios';

function getInstitucionName(id: string) { return instituciones.find(i => i.id === id)?.nombre || id; }
function getMedioName(id: string) { return medios.find(m => m.id === id)?.nombre || id; }
function getPubTitle(id: string | null) { return id ? publicaciones.find(p => p.id === id)?.titulo || id : 'Mención general'; }

const eventTypeColors: Record<string, string> = {
  'Citación Directa': '#2E4A62',
  'Participación en Audiencia': '#7B6FA5',
  'Insumo Técnico': '#D4953A',
};

const sentimentColors: Record<string, string> = {
  'Positivo': '#1E7A5F',
  'Neutro': '#D4953A',
  'Negativo': '#C4523A',
};

export default function Canales() {
  const [tab, setTab] = useState<Tab>('politico');

  const totalMenciones = mencionesMedios.length;
  const alcanceEstimado = totalMenciones * 45000;
  const sentimientoAvg = (mencionesMedios.filter(m => m.sentimiento === 'Positivo').length / totalMenciones * 100).toFixed(0);

  return (
    <div className="pt-16 min-h-screen" style={{ background: '#F7F7F5' }}>
      <div className="max-w-[1440px] mx-auto px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-[40px] leading-[48px] tracking-[-0.4px] text-[#1A1D23]" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Canales de Influencia
          </h1>
          <p className="text-[14px] text-[#5C6370] mt-1">
            Seguimiento de penetración política y mediática de las investigaciones ACA
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('politico')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-medium transition-colors ${
              tab === 'politico' ? 'bg-[#2E4A62] text-white' : 'bg-white border border-[#E5E7EB] text-[#5C6370] hover:text-[#1A1D23]'
            }`}
          >
            <Building2 className="w-4 h-4" /> ICI-Político
          </button>
          <button
            onClick={() => setTab('medios')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-medium transition-colors ${
              tab === 'medios' ? 'bg-[#2E4A62] text-white' : 'bg-white border border-[#E5E7EB] text-[#5C6370] hover:text-[#1A1D23]'
            }`}
          >
            <Newspaper className="w-4 h-4" /> ICI-Medios
          </button>
        </motion.div>

        {/* ICI-Político Tab */}
        {tab === 'politico' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[
                { label: 'INTERACCIONES TOTALES', value: impactoICIPolitico.length.toString(), icon: Building2, context: '5 citaciones directas' },
                { label: 'INSTITUCIONES', value: '3', icon: Users, context: 'Asamblea, CCSS, MEP' },
                { label: 'TIPOS DE EVENTO', value: '3', icon: TrendingUp, context: 'Audiencias, debates, insumos' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-xl border border-[#E5E7EB] p-6"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <stat.icon className="w-4 h-4 text-[#2E4A62]" />
                    <span className="text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0]">{stat.label}</span>
                  </div>
                  <p className="text-[36px] leading-[40px] tracking-[-0.36px] text-[#1A1D23]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                    {stat.value}
                  </p>
                  <p className="text-[12px] text-[#5C6370] mt-1">{stat.context}</p>
                </motion.div>
              ))}
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
              <h3 className="text-[18px] font-medium text-[#1A1D23] mb-6">Línea de Tiempo de Interacciones Políticas</h3>
              <div className="space-y-6">
                {actasLegislativas.map((acta, i) => {
                  const impacto = impactoICIPolitico.find(ici => ici.actaId === acta.id);
                  return (
                    <motion.div
                      key={acta.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex gap-4"
                    >
                      {/* Timeline line */}
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: impacto ? eventTypeColors[impacto.tipoInteraccion] || '#2E4A62' : '#9BA3B0' }} />
                        {i < actasLegislativas.length - 1 && <div className="w-0.5 flex-1 bg-[#E5E7EB] mt-1" />}
                      </div>
                      {/* Content */}
                      <div className="flex-1 pb-6">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-[13px] font-medium text-[#1A1D23]">{acta.tipoEvento}</span>
                          <span className="text-[12px] text-[#9BA3B0]">
                            {new Date(acta.fecha).toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                          <span className="text-[12px] font-mono text-[#9BA3B0] bg-[#F0F1F4] px-2 py-0.5 rounded">{acta.numeroExpediente}</span>
                        </div>
                        <p className="text-[14px] text-[#5C6370] mb-2">{acta.textoTranscripcion}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-[#5C6370]">{getInstitucionName(acta.institucionId)}</span>
                          {impacto && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: `${eventTypeColors[impacto.tipoInteraccion]}15`, color: eventTypeColors[impacto.tipoInteraccion] }}>
                              {impacto.tipoInteraccion}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ICI-Medios Tab */}
        {tab === 'medios' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[
                { label: 'TOTAL MENCIONES', value: totalMenciones.toString(), icon: Newspaper, context: '+23% vs trimestre anterior' },
                { label: 'ALCANCE ESTIMADO', value: `${(alcanceEstimado / 1000000).toFixed(1)}M`, icon: Eye, context: 'lectores potenciales' },
                { label: 'SENTIMIENTO PROMEDIO', value: `${sentimientoAvg}%`, icon: MessageSquare, context: 'de menciones positivas' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-xl border border-[#E5E7EB] p-6"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <stat.icon className="w-4 h-4 text-[#3A8B8C]" />
                    <span className="text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0]">{stat.label}</span>
                  </div>
                  <p className="text-[36px] leading-[40px] tracking-[-0.36px] text-[#1A1D23]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                    {stat.value}
                  </p>
                  <p className="text-[12px] text-[#5C6370] mt-1">{stat.context}</p>
                </motion.div>
              ))}
            </div>

            {/* Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl border border-[#E5E7EB] p-6 mb-8"
            >
              <h3 className="text-[18px] font-medium text-[#1A1D23] mb-6">Menciones por Medio</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mediaOutletData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F1F4" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#9BA3B0', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#5C6370', fontSize: 12 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    formatter={(value: number) => [`${value} menciones`, '']}
                  />
                  <Bar dataKey="menciones" fill="#3A8B8C" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Mentions Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl border border-[#E5E7EB] p-6"
            >
              <h3 className="text-[18px] font-medium text-[#1A1D23] mb-6">Menciones Recientes</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E5E7EB]">
                      <th className="text-left text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0] pb-3 pr-4">Fecha</th>
                      <th className="text-left text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0] pb-3 pr-4">Medio</th>
                      <th className="text-left text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0] pb-3 pr-4">Titular</th>
                      <th className="text-left text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0] pb-3 pr-4">Publicación</th>
                      <th className="text-left text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0] pb-3">Sentimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mencionesMedios.map((men, i) => {
                      const iciM = impactoICIMedios.find(ici => ici.mencionId === men.id);
                      return (
                        <tr key={men.id} className={`border-b border-[#F0F1F4] hover:bg-[#F5F5F3] transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF8]'}`}>
                          <td className="py-4 pr-4 text-[13px] text-[#5C6370] whitespace-nowrap">
                            {new Date(men.fecha).toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })}
                          </td>
                          <td className="py-4 pr-4 text-[14px] font-medium text-[#1A1D23]">{getMedioName(men.medioId)}</td>
                          <td className="py-4 pr-4 text-[14px] text-[#1A1D23] line-clamp-1">{men.titular}</td>
                          <td className="py-4 pr-4 text-[12px] text-[#5C6370] line-clamp-1">{getPubTitle(iciM?.pubId || null)}</td>
                          <td className="py-4">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full"
                              style={{ backgroundColor: `${sentimentColors[men.sentimiento]}15`, color: sentimentColors[men.sentimiento] }}>
                              {men.sentimiento}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
