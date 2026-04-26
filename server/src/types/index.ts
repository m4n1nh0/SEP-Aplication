export type Perfil = 'coordenador' | 'supervisor' | 'recepcionista' | 'estagiario' | 'paciente';
export type StatusConta = 'pendente_email' | 'ativo' | 'bloqueado' | 'suspenso';
export type StatusPaciente =
  | 'triagem_pendente' | 'triagem_aprovada'
  | 'aguardando' | 'em_contato' | 'agendado'
  | 'em_atendimento' | 'alta' | 'cancelado' | 'desistencia';

export interface JwtPayload {
  id:      number;   // usuario.id
  perfil:  Perfil;
  nome:    string;
  ref_id:  number;   // estagiario.id ou paciente.id
  jti:     string;   // UUID único da sessão
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      clientIp?: string;
    }
  }
}
