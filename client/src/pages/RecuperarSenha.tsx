import React, { useState } from 'react'
import { Btn } from '../components/ui'

export default function RecuperarSenha() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/recuperar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Erro ao solicitar recuperação')
      setEnviado(true)
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{maxWidth:400,margin:'40px auto',background:'#fff',borderRadius:12,padding:32,boxShadow:'0 2px 12px #0001'}}>
      <h2 style={{fontSize:20,fontWeight:800,marginBottom:18}}>Recuperar senha</h2>
      {enviado ? (
        <p style={{color:'#16a34a',fontWeight:600}}>Se o e-mail existir, enviaremos instruções para redefinir sua senha.</p>
      ) : (
        <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:14}}>
          <label style={{fontSize:13,fontWeight:600}}>E-mail cadastrado</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required style={{padding:'10px 12px',borderRadius:8,border:'1.5px solid #e7e5e4',fontSize:14}}/>
          {erro && <div style={{color:'#dc2626',fontSize:12}}>{erro}</div>}
          <Btn full type="submit" disabled={loading}>{loading?'Enviando...':'Enviar link de recuperação'}</Btn>
        </form>
      )}
    </div>
  )
}
