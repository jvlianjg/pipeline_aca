import { Routes, Route } from 'react-router'
import Navigation from '@/components/Navigation'
import Dashboard from '@/pages/Dashboard'
import Analisis from '@/pages/Analisis'
import Canales from '@/pages/Canales'
import Auditoria from '@/pages/Auditoria'
import Configuracion from '@/pages/Configuracion'

export default function App() {
  return (
    <>
      <Navigation />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/analisis" element={<Analisis />} />
        <Route path="/canales" element={<Canales />} />
        <Route path="/auditoria" element={<Auditoria />} />
        <Route path="/configuracion" element={<Configuracion />} />
      </Routes>
    </>
  )
}
