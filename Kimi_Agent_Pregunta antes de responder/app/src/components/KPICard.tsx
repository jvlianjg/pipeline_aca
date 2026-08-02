import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { KPIData } from '@/types';

interface KPICardProps {
  data: KPIData;
  index: number;
}

export default function KPICard({ data, index }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: [0.4, 0, 0.2, 1] }}
      className="bg-white rounded-xl border border-[#E5E7EB] p-6 relative overflow-hidden"
    >
      <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r" style={{ backgroundColor: data.accentColor }} />
      <div className="pl-3">
        <p className="text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0] mb-2">
          {data.label}
        </p>
        <motion.p
          className="text-[48px] leading-[52px] tracking-[-0.48px] text-[#1A1D23] font-normal"
          style={{ fontFamily: "'Instrument Serif', serif" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: index * 0.1 + 0.3 }}
        >
          {data.value}
        </motion.p>
        <div className="flex items-center gap-1.5 mt-2">
          {data.trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-[#1E7A5F]" />}
          {data.trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-[#C4523A]" />}
          {data.trend === 'neutral' && <Minus className="w-3.5 h-3.5 text-[#9BA3B0]" />}
          <span className={`text-[12px] font-medium ${
            data.trend === 'up' ? 'text-[#1E7A5F]' :
            data.trend === 'down' ? 'text-[#C4523A]' : 'text-[#9BA3B0]'
          }`}>
            {data.context}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
