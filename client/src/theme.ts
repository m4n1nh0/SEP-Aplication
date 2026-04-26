// ══════════════════════════════════════════════════════════════
// SEP DESIGN SYSTEM — Identidade visual acolhedora, verde base
// ══════════════════════════════════════════════════════════════

// ── Tokens globais ─────────────────────────────────────────
export const T = {
  // Fundos
  bg:       '#faf9f6',   // branco quente (não frio)
  surface:  '#ffffff',
  surfaceAlt:'#f5f4f0',

  // Bordas
  border:   '#e7e5e4',
  borderMed:'#d6d3d1',

  // Texto
  text:     '#1c1917',
  sub:      '#57534e',
  muted:    '#a8a29e',

  // Cor principal — Forest Green
  green:    '#16a34a',
  greenD:   '#14532d',
  greenL:   '#dcfce7',
  greenMid: '#166534',

  // Semânticos
  red:      '#dc2626',
  redL:     '#fef2f2',
  amber:    '#b45309',
  amberL:   '#fef3c7',
  teal:     '#0891b2',
  tealL:    '#cffafe',
  purple:   '#7c3aed',
  purpleL:  '#ede9fe',
}

// ── Perfis — cada um com sidebar e gradiente próprios ──────
export const PERFIL = {
  supervisor: {
    sidebar:  'linear-gradient(160deg,#1c1a14,#2a1f0a)',
    active:   'linear-gradient(135deg,#92400e,#b45309)',
    accent:   '#b45309',
    accentL:  '#fef3c7',
    accentD:  '#92400e',
    role:     'Supervisor SEP',
    tagline:  'Gestão clínica',
  },
  recepcionista: {
    sidebar:  'linear-gradient(160deg,#0a1e24,#0c2d38)',
    active:   'linear-gradient(135deg,#0e7490,#0891b2)',
    accent:   '#0891b2',
    accentL:  '#cffafe',
    accentD:  '#0e7490',
    role:     'Assistente Administrativo',
    tagline:  'Atendimento operacional',
  },
  estagiario: {
    sidebar:  'linear-gradient(160deg,#130e24,#1e1240)',
    active:   'linear-gradient(135deg,#5b21b6,#7c3aed)',
    accent:   '#7c3aed',
    accentL:  '#ede9fe',
    accentD:  '#5b21b6',
    role:     'Estagiário(a)',
    tagline:  'Atendimento clínico',
  },
  paciente: {
    sidebar:  'linear-gradient(160deg,#0a1f12,#14301e)',
    active:   'linear-gradient(135deg,#14532d,#16a34a)',
    accent:   '#16a34a',
    accentL:  '#dcfce7',
    accentD:  '#14532d',
    role:     'Paciente',
    tagline:  'Portal de autoatendimento',
  },
}

// ── Status e urgência (chips) — mesmos de antes ────────────
export const S_COR: Record<string,string> = {
  triagem_pendente:'#b45309', aguardando:'#78716c',
  em_contato:'#0891b2', agendado:'#7c3aed',
  em_atendimento:'#16a34a', alta:'#14532d',
  cancelado:'#dc2626', desistencia:'#a8a29e',
}
export const S_LBL: Record<string,string> = {
  triagem_pendente:'Triagem pendente', aguardando:'Aguardando',
  em_contato:'Em Contato', agendado:'Agendado',
  em_atendimento:'Em Atendimento', alta:'Alta',
  cancelado:'Cancelado', desistencia:'Desistência',
}
export const U_COR: Record<string,string> = {
  muito_urgente:'#dc2626', urgente:'#b45309',
  pouco_urgente:'#b45309', sem_urgencia:'#16a34a',
}
export const U_LBL: Record<string,string> = {
  muito_urgente:'Muito urgente', urgente:'Urgente',
  pouco_urgente:'Pouco urgente', sem_urgencia:'Sem urgência',
}
