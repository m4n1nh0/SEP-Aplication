import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import SupervisorApp    from './pages/admin/AdminApp'
import RecepcionistaApp from './pages/recepcao/RecepcionistaApp'
import EstagiarioApp    from './pages/estagiario/EstagiarioApp'
import PortalApp        from './pages/portal/PortalApp'
import './global.css'

const Loading = () => (
  <div style={{
    minHeight: '100vh', background: '#f0f4f8',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'system-ui, sans-serif',
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 36, height: 36, margin: '0 auto 12px',
        border: '3px solid #e2e8f0', borderTopColor: '#1e40af',
        borderRadius: '50%', animation: 'spin 1s linear infinite',
      }}/>
      <p style={{ color: '#94a3b8', fontSize: 13 }}>Carregando...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  </div>
)

function Router() {
  const { user, loading } = useAuth()

  if (loading) return <Loading/>

  if (!user) {
    const RecuperarSenha = React.lazy(() => import('./pages/RecuperarSenha'));
    const RedefinirSenha = React.lazy(() => import('./pages/RedefinirSenha'));
    return (
      <Routes>
        <Route path="/recuperar-senha" element={<RecuperarSenha/>}/>
        <Route path="/redefinir-senha" element={<RedefinirSenha/>}/>
        <Route path="*" element={<Login/>}/>
      </Routes>
    )
  }

  // Mapa de rota base por perfil
  const BASE: Record<string, string> = {
    coordenador:   '/supervisor',
    supervisor:    '/supervisor',
    recepcionista: '/recepcao',
    estagiario:    '/estagiario',
    paciente:      '/portal',
  }
  const base = BASE[user.perfil] ?? '/'

  return (
    <Routes>
      {(user.perfil === 'coordenador' || user.perfil === 'supervisor') && <Route path="/supervisor/*"  element={<SupervisorApp/>}/>}
      {user.perfil === 'recepcionista' && <Route path="/recepcao/*"    element={<RecepcionistaApp/>}/>}
      {user.perfil === 'estagiario'    && <Route path="/estagiario/*"  element={<EstagiarioApp/>}/>}
      {user.perfil === 'paciente'      && <Route path="/portal/*"      element={<PortalApp/>}/>}
      <Route path="*" element={<Navigate to={base} replace/>}/>
    </Routes>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Suspense fallback={<Loading/>}>
          <Router/>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
