export const formatDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDateShort = (timestamp: string): string => {
  return new Date(timestamp).toLocaleDateString('pt-BR');
};

// --- Status ---

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  pendente:        { label: 'Pendente',        badgeClass: 'badge-pendente' },
  em_atendimento:  { label: 'Em Atendimento',  badgeClass: 'badge-em-atendimento' },
  solucionado:     { label: 'Solucionado',     badgeClass: 'badge-solucionado' },
  solucao_negada:  { label: 'Solução Negada',  badgeClass: 'badge-solucao-negada' },
  concluido:       { label: 'Concluído',       badgeClass: 'badge-concluido' },
  fechado:         { label: 'Fechado',         badgeClass: 'badge-fechado' },
};

export const getStatusLabel = (status: string): string =>
  STATUS_CONFIG[status]?.label || status;

export const getStatusColor = (status: string): string =>
  STATUS_CONFIG[status]?.badgeClass || 'badge-status-default';

// --- Tipo do chamado ---

const TIPO_CONFIG: Record<string, { label: string; badgeClass: string; textoClass: string }> = {
  'Suporte TI':     { label: 'Suporte TI',     badgeClass: 'badge-tipo-suporte',        textoClass: 'texto-tipo-suporte' },
  'Provas':         { label: 'Provas',         badgeClass: 'badge-tipo-provas',         textoClass: 'texto-tipo-provas' },
  'Infraestrutura': { label: 'Infraestrutura', badgeClass: 'badge-tipo-infraestrutura', textoClass: 'texto-tipo-infraestrutura' },
  'Outros':         { label: 'Outros',         badgeClass: 'badge-tipo-outros',         textoClass: 'texto-tipo-outros' },
  'Retorno':        { label: 'Retorno',        badgeClass: 'badge-tipo-retorno',        textoClass: 'texto-tipo-retorno' },
};

export const getTipoLabel = (tipo: string): string =>
  TIPO_CONFIG[tipo]?.label || tipo;

export const getTipoTextColor = (tipo: string): string =>
  TIPO_CONFIG[tipo]?.textoClass || 'texto-tipo-outros';

// --- Roles ---

const ROLE_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  admin:       { label: 'Administrador', badgeClass: 'badge-role-admin' },
  tecnico:     { label: 'Técnico',       badgeClass: 'badge-role-tecnico' },
  solicitante: { label: 'Solicitante',   badgeClass: 'badge-role-solicitante' },
};

export const getRoleLabel = (role: string): string =>
  ROLE_CONFIG[role]?.label || role;

export const getRoleBadgeColor = (role: string): string =>
  ROLE_CONFIG[role]?.badgeClass || 'badge-role-default';

// --- Mensagem motivacional baseada na nota ---

export const getMotivationalMessage = (media: number): { text: string; emoji: string } => {
  if (media >= 5.5) return { text: 'Excelente! Trabalho excepcional!', emoji: '🏆' };
  if (media >= 4.5) return { text: 'Muito bom! Continue assim!', emoji: '⭐' };
  if (media >= 3.5) return { text: 'Bom trabalho! Sempre melhorando.', emoji: '👍' };
  if (media >= 2.5) return { text: 'Há espaço para melhorias.', emoji: '📈' };
  if (media > 0)    return { text: 'Foco na qualidade do atendimento.', emoji: '💪' };
  return { text: 'Sem avaliações ainda.', emoji: '📋' };
};
