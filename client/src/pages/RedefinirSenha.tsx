import React, { useState } from 'react'
import { Btn, ForcaSenha } from '../components/ui'

export default function RedefinirSenha() {
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [ok, setOk] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token') || ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(''); setLoading(true)
    if (novaSenha !== confirmar) {
      setErro('As senhas não coincidem.'); setLoading(false); return
    }
    try {
      const res = await fetch('/api/auth/redefinir-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha })
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Erro ao redefinir senha')
      setOk(true)
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!token) return <div style={{maxWidth:400,margin:'40px auto',background:'#fff',borderRadius:12,padding:32,boxShadow:'0 2px 12px #0001'}}><h2>Token inválido</h2></div>

  return (
    <div style={{maxWidth:400,margin:'40px auto',background:'#fff',borderRadius:12,padding:32,boxShadow:'0 2px 12px #0001'}}>
      <h2 style={{fontSize:20,fontWeight:800,marginBottom:18}}>Redefinir senha</h2>
      {ok ? (
        <p style={{color:'#16a34a',fontWeight:600}}>Senha redefinida com sucesso! Você já pode fazer login.</p>
      ) : (
        <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:14}}>
          <label style={{fontSize:13,fontWeight:600}}>Nova senha</label>
            <input value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} required minLength={8} style={{padding:'10px 12px',borderRadius:8,border:'1.5px solid #e7e5e4',fontSize:14}}/>
          <ForcaSenha senha={novaSenha}/>
          <label style={{fontSize:13,fontWeight:600}}>Confirmar nova senha</label>
          <input type="password" value={confirmar} onChange={e=>setConfirmar(e.target.value)} required minLength={8} style={{padding:'10px 12px',borderRadius:8,border:'1.5px solid #e7e5e4',fontSize:14}}/>
          {erro && <div style={{color:'#dc2626',fontSize:12}}>{erro}</div>}
          <Btn full disabled={loading}>{loading?'Redefinindo...':'Redefinir senha'}</Btn>
        </form>
      )}
    </div>
  )
}
