import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { Menu, X, Bell, Search } from 'lucide-react';

const navLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/analisis', label: 'Análisis' },
  { to: '/canales', label: 'Canales' },
  { to: '/auditoria', label: 'Auditoría' },
  { to: '/configuracion', label: 'Configuración' },
];

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-[#E5E7EB]"
      style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
      <div className="h-full max-w-[1440px] mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #2E4A62, #1E7A5F)' }}>
            A
          </div>
          <span className="text-[13px] font-medium tracking-[-0.13px] text-[#1A1D23]">
            Sistema de Inteligencia
          </span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(link => {
            const isActive = location.pathname === link.to;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={`px-4 py-2 text-[13px] font-medium tracking-[-0.13px] transition-colors relative ${
                  isActive ? 'text-[#2E4A62]' : 'text-[#5C6370] hover:text-[#1A1D23]'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-[#2E4A62]" />
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button className="hidden md:flex w-9 h-9 items-center justify-center rounded-lg hover:bg-[#F0F1F4] transition-colors">
            <Search className="w-4 h-4 text-[#5C6370]" />
          </button>
          <button className="hidden md:flex w-9 h-9 items-center justify-center rounded-lg hover:bg-[#F0F1F4] transition-colors relative">
            <Bell className="w-4 h-4 text-[#5C6370]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#C4523A] rounded-full" />
          </button>
          <div className="hidden md:flex w-8 h-8 rounded-full bg-[#2E4A62] items-center justify-center text-white text-[11px] font-medium">
            JD
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#F0F1F4]"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-[#E5E7EB] shadow-lg">
          <div className="px-6 py-4 flex flex-col gap-1">
            {navLinks.map(link => {
              const isActive = location.pathname === link.to;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-3 rounded-lg text-[14px] font-medium transition-colors ${
                    isActive ? 'bg-[#2E4A62]/5 text-[#2E4A62]' : 'text-[#5C6370] hover:bg-[#F0F1F4]'
                  }`}
                >
                  {link.label}
                </NavLink>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
