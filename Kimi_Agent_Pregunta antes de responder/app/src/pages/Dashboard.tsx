import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, Cell, PieChart, Pie
} from 'recharts';
import KPICard from '@/components/KPICard';
import { AdopcionBadge } from '@/components/Badge';
import ProgressBar from '@/components/ProgressBar';
import {
  kpiData, monthlyTrends, themeImpacts, impactosIII,
  publicaciones, politicasPublicas, channelData, autores, instituciones
} from '@/data/mockData';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router';

function getAutorName(id: string) {
  return autores.find(a => a.id === id)?.nombre || id;
}

function getInstitucionName(id: string) {
  return instituciones.find(i => i.id === id)?.nombre || id;
}

const chartColors = {
  navy: '#2E4A62',
  teal: '#3A8B8C',
  green: '#1E7A5F',
  amber: '#D4953A',
  terracotta: '#C4523A',
  lavender: '#7B6FA5',
};

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="pt-16 min-h-screen" style={{ background: '#F7F7F5' }}>
      <div className="max-w-[1440px] mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="text-[40px] leading-[48px] tracking-[-0.4px] text-[#1A1D23]" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Dashboard Ejecutivo
          </h1>
          <p className="text-[14px] leading-[24px] text-[#5C6370] mt-1">
            Sistema de Inteligencia y Medición de Impacto — Julio 2026
          </p>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpiData.map((kpi, i) => (
            <KPICard key={kpi.label} data={kpi} index={i} />
          ))}
        </div>

        {/* Trend Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {/* III Trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="bg-white rounded-xl border border-[#E5E7EB] p-6"
          >
            <div className="mb-6">
              <h3 className="text-[18px] font-medium leading-[28px] tracking-[-0.18px] text-[#1A1D23]">
                Evolución del III
              </h3>
              <p className="text-[12px] text-[#5C6370] mt-0.5">Índice de Impacto de Ideas — últimos 6 meses</p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyTrends} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="iiiGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.navy} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={chartColors.navy} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F1F4" />
                <XAxis dataKey="month" tick={{ fill: '#9BA3B0', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#9BA3B0', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(value: number) => [`${value}%`, 'III Score']}
                />
                <Area type="monotone" dataKey="iiiScore" stroke={chartColors.navy} strokeWidth={2} fill="url(#iiiGradient)" dot={{ r: 4, fill: '#fff', stroke: chartColors.navy, strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Channel Trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="bg-white rounded-xl border border-[#E5E7EB] p-6"
          >
            <div className="mb-6">
              <h3 className="text-[18px] font-medium leading-[28px] tracking-[-0.18px] text-[#1A1D23]">
                Canales de Influencia
              </h3>
              <p className="text-[12px] text-[#5C6370] mt-0.5">ICI-Político vs ICI-Medios — últimos 6 meses</p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyTrends} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F1F4" />
                <XAxis dataKey="month" tick={{ fill: '#9BA3B0', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9BA3B0', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="iciPolitico" name="ICI-Político" fill={chartColors.navy} radius={[4, 4, 0, 0]} />
                <Bar dataKey="iciMedios" name="ICI-Medios" fill={chartColors.teal} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Impact by Theme + Channel Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {/* Theme Impact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="lg:col-span-2 bg-white rounded-xl border border-[#E5E7EB] p-6"
          >
            <div className="mb-6">
              <h3 className="text-[24px] font-medium leading-[32px] tracking-[-0.24px] text-[#1A1D23]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Impacto por Temática
              </h3>
              <p className="text-[14px] text-[#5C6370] mt-1">Distribución del Índice III por área temática de investigación</p>
            </div>
            <div className="space-y-4">
              {themeImpacts.map((t, i) => (
                <motion.div
                  key={t.temaId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.7 + i * 0.05 }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[14px] font-medium text-[#1A1D23]">{t.temaNombre}</span>
                    <span className="text-[13px] text-[#5C6370]">{t.pubCount} publicaciones</span>
                  </div>
                  <ProgressBar value={t.iiiScore} color={chartColors.green} />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Channel Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.7 }}
            className="bg-white rounded-xl border border-[#E5E7EB] p-6"
          >
            <div className="mb-6">
              <h3 className="text-[24px] font-medium leading-[32px] tracking-[-0.24px] text-[#1A1D23]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Canales de Influencia
              </h3>
              <p className="text-[14px] text-[#5C6370] mt-1">Distribución total de interacciones</p>
            </div>
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={channelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {channelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    formatter={(value: number, name: string, props: any) => [`${value}% (${props?.payload?.count} interacciones)`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center -mt-4 mb-4">
                <p className="text-[36px] leading-[40px] tracking-[-0.36px] text-[#1A1D23]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  385
                </p>
                <p className="text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0]">Interacciones totales</p>
              </div>
              <div className="w-full space-y-2">
                {channelData.map(c => (
                  <div key={c.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: c.color }} />
                      <span className="text-[13px] text-[#5C6370]">{c.name}</span>
                    </div>
                    <span className="text-[13px] font-medium text-[#1A1D23]">{c.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Recent Matches Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="bg-white rounded-xl border border-[#E5E7EB] p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[24px] font-medium leading-[32px] tracking-[-0.24px] text-[#1A1D23]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Coincidencias Recientes
              </h3>
              <p className="text-[14px] text-[#5C6370] mt-1">Publicaciones ACA vinculadas con políticas públicas</p>
            </div>
            <button
              onClick={() => navigate('/analisis')}
              className="flex items-center gap-1.5 text-[13px] font-medium text-[#2E4A62] hover:text-[#1E7A5F] transition-colors"
            >
              Ver todas <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="text-left text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0] pb-3 pr-4">Publicación</th>
                  <th className="text-left text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0] pb-3 pr-4">Política Pública</th>
                  <th className="text-left text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0] pb-3 pr-4">III Score</th>
                  <th className="text-left text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0] pb-3 pr-4">Adopción</th>
                  <th className="text-left text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0] pb-3">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {impactosIII.map((imp, i) => {
                  const pub = publicaciones.find(p => p.id === imp.pubId);
                  const pol = politicasPublicas.find(p => p.id === imp.politicaId);
                  if (!pub || !pol) return null;
                  return (
                    <tr
                      key={imp.id}
                      className={`border-b border-[#F0F1F4] hover:bg-[#F5F5F3] transition-colors cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF8]'}`}
                      onClick={() => navigate('/analisis')}
                    >
                      <td className="py-4 pr-4">
                        <p className="text-[14px] font-medium text-[#1A1D23] line-clamp-1">{pub.titulo}</p>
                        <p className="text-[12px] text-[#5C6370]">{getAutorName(pub.autorId)}</p>
                      </td>
                      <td className="py-4 pr-4">
                        <p className="text-[14px] text-[#1A1D23] line-clamp-1">{pol.nombre}</p>
                        <p className="text-[12px] text-[#5C6370]">{getInstitucionName(pol.institucionId)}</p>
                      </td>
                      <td className="py-4 pr-4">
                        <ProgressBar value={imp.iiiScoreFinal * 100} color={chartColors.green} height={6} />
                      </td>
                      <td className="py-4 pr-4">
                        <AdopcionBadge level={imp.nivelAdopcion} />
                      </td>
                      <td className="py-4 text-[13px] text-[#5C6370] whitespace-nowrap">
                        {new Date(imp.fechaCalculo).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
