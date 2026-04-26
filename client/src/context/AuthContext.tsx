import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Perfil = 'coordenador' | 'supervisor' | 'recepcionista' | 'estagiario' | 'paciente'

export interface User {
  id: number; nome: string; email: string; perfil: Perfil; ref_id: number
}

interface AuthCtx {
  user: User | null; token: string | null
  login: (email: string, senha: string, totp?: string) => Promise<{ requires_totp?: boolean }>
  logout: () => Promise<void>
  loading: boolean
}

const Ctx = createContext<AuthCtx>({} as AuthCtx)

const PERFIS_VALIDOS: Perfil[] = ['coordenador', 'supervisor', 'recepcionista', 'estagiario', 'paciente']

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user,    setUser]    = useState<User | null>(null)
  const [token,   setToken]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const t = localStorage.getItem('sep_token')
      const u = localStorage.getItem('sep_user')
      if (t && u) {
        const parsed = JSON.parse(u)
        // Descarta sessões com perfil inválido (ex: 'admin' de versão anterior)
        if (parsed?.perfil && PERFIS_VALIDOS.includes(parsed.perfil)) {
          setToken(t)
          setUser(parsed)
        } else {
          localStorage.removeItem('sep_token')
          localStorage.removeItem('sep_user')
        }
      }
    } catch {
      localStorage.removeItem('sep_token')
      localStorage.removeItem('sep_user')
    }
    setLoading(false)
  }, [])

  const login = async (email: string, senha: string, totp?: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha, ...(totp ? { totp_code: totp } : {}) }),
    })
    const data = await res.json()
    if (!data.success) {
      if (data.requires_totp) return { requires_totp: true }
      throw new Error(data.error || 'Erro ao fazer login')
    }
    localStorage.setItem('sep_token', data.token)
    localStorage.setItem('sep_user',  JSON.stringify(data.user))
    setToken(data.token)
    setUser(data.user)
    return {}
  }

  const logout = async () => {
    try {
      const t = localStorage.getItem('sep_token')
      if (t) await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${t}` } })
    } finally {
      localStorage.removeItem('sep_token')
      localStorage.removeItem('sep_user')
      setToken(null)
      setUser(null)
    }
  }

  return <Ctx.Provider value={{ user, token, login, logout, loading }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
