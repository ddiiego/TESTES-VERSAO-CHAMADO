export interface Chamado {
  id: number;
  codigo?: string;
  mensagem: string;
  descricao: string;
  nome_solicitante: string;
  local_suporte: string;
  local_nome: string;
  setor_solicitante: string;
  timestamp: string;
  status?: string;
  local_id?: number;
  setor_id?: number;
  tecnico_atendimento?: string;
  tecnico_nome?: string;
  tecnicos_adicionais?: string[];
  tecnicos_adicionais_nomes?: string[];
  problema_encontrado?: string;
  solucao_aplicada?: string;
  nota_validacao?: number;
  observacao_validacao?: string;
  data_atendimento?: string;
  data_conclusao?: string;
  data_validacao?: string;
}

export interface Usuario {
  id: string;
  username: string;
  nome_completo: string;
  role: string;
  setor_id: string | null;
  created_at: string;
}

export interface Setor {
  id: string;
  nome: string;
  slug: string;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  chamado_id: number;
  usuario: string;
  nome_usuario: string;
  role: string;
  mensagem: string;
  resposta_id?: number;
  visto_por: { usuario: string; data: string }[];
  created_at: string;
}

export interface RankingTecnico {
  username: string;
  nome_completo: string;
  media_diaria: number;
  media_semanal: number;
  media_mensal: number;
  media_semestral: number;
  total_chamados: number;
  chamados_mes: number;
}
