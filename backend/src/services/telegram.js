const axios = require('axios');
const { config } = require('../config');

/**
 * Envia notificação sintetizada para o Telegram.
 * Formato limpo: 3-4 linhas, sem decorações excessivas.
 */
async function sendTelegramNotification(text) {
  const { botToken, chatId } = config.telegram;

  if (!botToken || !chatId) return;

  try {
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    });
  } catch (err) {
    console.error('[TELEGRAM] Erro ao enviar:', err.message);
  }
}

/**
 * Envia uma foto para o Telegram.
 */
async function sendTelegramPhoto(photoUrl, caption) {
  const { botToken, chatId } = config.telegram;

  if (!botToken || !chatId || !photoUrl) return;

  try {
    await axios.post(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: 'Markdown',
    });
  } catch (err) {
    console.error('[TELEGRAM] Erro ao enviar foto:', err.message);
  }
}

// --- Templates de mensagem sintetizados ---

const templates = {
  novoChamado: (codigo, solicitante, local, titulo) =>
    `📋 *CHAMADO #${codigo}* | Novo\n👤 ${solicitante} → ${local}\n📌 ${titulo}`,

  retorno: (codigo, solicitante, mensagem) =>
    `🔄 *CHAMADO #${codigo}* | Retorno\n👤 ${solicitante}\n💬 ${mensagem}`,

  emAtendimento: (codigo, tecnico) =>
    `👨‍🔧 *CHAMADO #${codigo}* | Em Atendimento\n🛠️ Técnico: ${tecnico}`,

  diagnostico: (codigo, tecnico, problema, titulo, descricao) =>
    `🔍 *CHAMADO #${codigo}* | Diagnóstico\n👨‍🔧 Por: ${tecnico}\n📌 *Assunto:* ${titulo}\n📝 *Relato:* ${descricao || 'S/D'}\n\n⚠️ *DIAGNÓSTICO:* ${problema}`,

  solucionado: (codigo, problema, solucao, titulo, descricao) =>
    `✅ *CHAMADO #${codigo}* | Solucionado\n📌 *Assunto:* ${titulo}\n📝 *Relato:* ${descricao || 'S/D'}\n\n🔍 *Problema:* ${problema}\n💡 *Solução:* ${solucao}\n⏳ Aguardando validação`,

  solucaoAtualizada: (codigo, problema, solucao, titulo, descricao) =>
    `📝 *CHAMADO #${codigo}* | Solução Atualizada\n📌 *Assunto:* ${titulo}\n\n🔍 *Problema:* ${problema}\n💡 *Solução:* ${solucao}`,

  concluido: (codigo, nota) =>
    `⭐ *CHAMADO #${codigo}* | Concluído\n📊 Nota: ${nota}/6`,

  solucaoNegada: (codigo, solicitante) =>
    `❌ *CHAMADO #${codigo}* | Solução Negada\n👤 Reprovado por: ${solicitante}`,

  fechado: (codigo, nota) =>
    `🔒 *CHAMADO #${codigo}* | Fechado\n📊 Nota Final: ${nota}/6`,

  reaberto: (codigo, admin) =>
    `♻️ *CHAMADO #${codigo}* | Reaberto\n👮 Por: ${admin}`,

  tecnicoAdicionado: (codigo, tecnico, novoTecnico) =>
    `🤝 *CHAMADO #${codigo}* | Apoio\n👨‍🔧 ${tecnico} + ${novoTecnico}`,
};

module.exports = { sendTelegramNotification, sendTelegramPhoto, templates };
