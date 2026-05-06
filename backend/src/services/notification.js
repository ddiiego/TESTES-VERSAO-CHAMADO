const { supabase } = require('../config');

/**
 * Cria uma notificação interna no banco (tabela notificacoes).
 */
async function createNotification(usuario, titulo, mensagem, chamado_id = null) {
  try {
    const { error } = await supabase
      .from('notificacoes')
      .insert([{ usuario, titulo, mensagem, chamado_id, lida: false, created_at: new Date().toISOString() }]);
    if (error) throw error;
  } catch (err) {
    console.error('[NOTIFICAÇÃO] Erro ao criar:', err.message);
  }
}

/**
 * Insere uma mensagem de sistema no chat de um chamado.
 * Essas mensagens são renderizadas de forma diferente no frontend (centralizadas).
 */
async function createChatSystemMessage(chamadoId, mensagem) {
  try {
    const { error } = await supabase
      .from('chat_mensagens')
      .insert([{
        chamado_id: chamadoId,
        usuario: 'sistema',
        nome_usuario: 'Sistema',
        role: 'sistema',
        mensagem,
        visto_por: [],
      }]);
    if (error) throw error;
  } catch (err) {
    console.error('[CHAT SISTEMA] Erro ao inserir:', err.message);
  }
}

/**
 * Notifica todos os admins sobre um evento.
 */
async function notifyAdmins(titulo, mensagem, chamadoId = null) {
  try {
    const { data: admins } = await supabase.from('usuarios').select('username').eq('role', 'admin');
    if (admins) {
      for (const admin of admins) {
        await createNotification(admin.username, titulo, mensagem, chamadoId);
      }
    }
  } catch (err) {
    console.error('[NOTIFICAÇÃO] Erro ao notificar admins:', err.message);
  }
}

/**
 * Busca o username do solicitante a partir do nome completo.
 */
async function findSolicitanteUsername(nomeCompleto) {
  if (!nomeCompleto) return null;
  const { data } = await supabase
    .from('usuarios')
    .select('username')
    .eq('nome_completo', nomeCompleto)
    .maybeSingle();
  return data?.username || null;
}

/**
 * Busca o nome completo a partir do username.
 */
async function getUserFullName(username) {
  if (!username) return username;
  const { data } = await supabase
    .from('usuarios')
    .select('nome_completo')
    .eq('username', username)
    .maybeSingle();
  return data?.nome_completo || username;
}

module.exports = {
  createNotification,
  createChatSystemMessage,
  notifyAdmins,
  findSolicitanteUsername,
  getUserFullName,
};
