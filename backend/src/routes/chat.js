const express = require('express');
const { supabase } = require('../config');
const { authenticateToken } = require('../middleware/auth');
const { createNotification } = require('../services/notification');
const { sendTelegramNotification, sendTelegramPhoto } = require('../services/telegram');

const router = express.Router();

// GET /api/chamados/:id/chat
router.get('/:id/chat', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: messages, error } = await supabase
      .from('chat_mensagens')
      .select('*')
      .eq('chamado_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const { data: chamado } = await supabase
      .from('logs_chamados')
      .select('status, nome_solicitante')
      .eq('id', id)
      .maybeSingle();

    res.json({ messages: messages || [], chamadoStatus: chamado?.status || null });
  } catch (err) {
    console.error('[CHAT] Erro ao buscar mensagens:', err.message);
    res.status(500).json({ message: 'Erro ao buscar mensagens' });
  }
});

// GET /api/chamados/:id/chat/nao-vistos
router.get('/:id/chat/nao-vistos', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const nomeExibicao = req.user.nome_completo || req.user.username;

    const { data: messages, error } = await supabase
      .from('chat_mensagens')
      .select('id, visto_por')
      .eq('chamado_id', id)
      .neq('usuario', req.user.username);

    if (error) throw error;

    let count = 0;
    for (const msg of (messages || [])) {
      const vistos = Array.isArray(msg.visto_por) ? msg.visto_por : [];
      if (!vistos.find(v => v.usuario === nomeExibicao)) count++;
    }

    res.json({ count });
  } catch (err) {
    res.status(500).json({ count: 0 });
  }
});

// PATCH /api/chamados/:id/chat/visto
router.patch('/:id/chat/visto', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const nomeExibicao = req.user.nome_completo || req.user.username;

    const { data: messages } = await supabase
      .from('chat_mensagens')
      .select('id, visto_por')
      .eq('chamado_id', id)
      .neq('usuario', req.user.username);

    if (messages) {
      for (const msg of messages) {
        const vistos = Array.isArray(msg.visto_por) ? msg.visto_por : [];
        if (!vistos.find(v => v.usuario === nomeExibicao)) {
          vistos.push({ usuario: nomeExibicao, data: new Date().toISOString() });
          await supabase.from('chat_mensagens').update({ visto_por: vistos }).eq('id', msg.id);
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[CHAT] Erro ao marcar como visto:', err.message);
    res.status(500).json({ message: 'Erro ao marcar como visto' });
  }
});

// POST /api/chamados/:id/chat
router.post('/:id/chat', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { mensagem, resposta_id, imagem_url } = req.body;

    if ((!mensagem || !mensagem.trim()) && !imagem_url) {
      return res.status(400).json({ message: 'Mensagem ou imagem é obrigatória' });
    }

    const { data: chamado } = await supabase
      .from('logs_chamados')
      .select('status, tecnico_atendimento, nome_solicitante, codigo')
      .eq('id', id)
      .maybeSingle();

    if (!chamado) return res.status(404).json({ message: 'Chamado não encontrado' });
    if (chamado.status === 'fechado' || chamado.status === 'concluido') {
      return res.status(400).json({ message: 'Chat encerrado' });
    }

    const nomeExibicao = req.user.nome_completo || req.user.username;

    const insertData = {
      chamado_id: id,
      usuario: req.user.username,
      nome_usuario: nomeExibicao,
      role: req.user.role || 'solicitante',
      mensagem: mensagem?.trim() || '',
      imagem_url: imagem_url || null,
      visto_por: [{ usuario: nomeExibicao, data: new Date().toISOString() }],
    };

    if (resposta_id) insertData.resposta_id = resposta_id;

    const { data: msg, error } = await supabase.from('chat_mensagens').insert([insertData]).select().single();
    if (error) throw error;

    // Notificar participantes e Telegram
    try {
      const msgTelegram = `💬 *CHAMADO #${chamado.codigo || id}* | Chat\n👤 ${nomeExibicao}\n\n${mensagem || (imagem_url ? '[Imagem]' : '')}`;
      
      if (imagem_url) {
        await sendTelegramPhoto(imagem_url, msgTelegram);
      } else {
        await sendTelegramNotification(msgTelegram);
      }

      const recipients = new Set();
      const notificationService = require('../services/notification');
      const solicitanteUsername = await notificationService.findSolicitanteUsername(chamado.nome_solicitante);
      
      if (solicitanteUsername && solicitanteUsername !== req.user.username) recipients.add(solicitanteUsername);
      if (chamado.tecnico_atendimento && chamado.tecnico_atendimento !== req.user.username) recipients.add(chamado.tecnico_atendimento);

      const { data: admins } = await supabase.from('usuarios').select('username').eq('role', 'admin');
      if (admins) admins.forEach(a => { if (a.username !== req.user.username) recipients.add(a.username); });

      for (const username of recipients) {
        await createNotification(username, '💬 Nova Mensagem', `${nomeExibicao} enviou uma mensagem no chamado #${chamado.codigo || id}`, id);
      }
    } catch (notifErr) {
      console.error('[CHAT] Erro ao criar notificações:', notifErr.message);
    }

    res.json({ success: true, message: msg });
  } catch (err) {
    console.error('[CHAT] Erro ao enviar mensagem:', err.message);
    res.status(500).json({ message: 'Erro ao enviar mensagem' });
  }
});

// PATCH /api/chamados/:id/chat/:msgId
router.patch('/:id/chat/:msgId', authenticateToken, async (req, res) => {
  try {
    const { msgId } = req.params;
    const { mensagem, imagem_url } = req.body;

    const { data: original, error: fetchError } = await supabase
      .from('chat_mensagens')
      .select('*')
      .eq('id', msgId)
      .single();

    if (fetchError || !original) return res.status(404).json({ message: 'Mensagem não encontrada' });
    
    // Apenas o próprio usuário ou admin pode editar
    if (original.usuario !== req.user.username && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Sem permissão para editar esta mensagem' });
    }

    // Se a imagem mudou, remover a antiga do storage
    if (original.imagem_url && imagem_url && original.imagem_url !== imagem_url) {
      try {
        const path = original.imagem_url.split('/').pop();
        await supabase.storage.from('chamados-anexos').remove([path]);
      } catch (e) {
        console.error('[CHAT] Erro ao remover imagem antiga:', e.message);
      }
    }

    const { data: updated, error } = await supabase
      .from('chat_mensagens')
      .update({
        mensagem: mensagem?.trim() || original.mensagem,
        imagem_url: imagem_url !== undefined ? imagem_url : original.imagem_url,
        editada: true,
        editada_em: new Date().toISOString()
      })
      .eq('id', msgId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, message: updated });
  } catch (err) {
    console.error('[CHAT] Erro ao editar mensagem:', err.message);
    res.status(500).json({ message: 'Erro ao editar mensagem' });
  }
});

// DELETE /api/chamados/:id/chat/:msgId
router.delete('/:id/chat/:msgId', authenticateToken, async (req, res) => {
  try {
    const { msgId } = req.params;

    const { data: msg, error: fetchError } = await supabase
      .from('chat_mensagens')
      .select('usuario, imagem_url')
      .eq('id', msgId)
      .single();

    if (fetchError || !msg) return res.status(404).json({ message: 'Mensagem não encontrada' });

    // Apenas o dono ou admin pode excluir
    if (msg.usuario !== req.user.username && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Sem permissão para excluir esta mensagem' });
    }

    // Se houver imagem, remover do storage
    if (msg.imagem_url) {
      try {
        const path = msg.imagem_url.split('/').pop();
        await supabase.storage.from('chamados-anexos').remove([path]);
      } catch (e) {
        console.error('[CHAT] Erro ao remover imagem do storage:', e.message);
      }
    }

    const { error } = await supabase.from('chat_mensagens').delete().eq('id', msgId);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('[CHAT] Erro ao excluir mensagem:', err.message);
    res.status(500).json({ message: 'Erro ao excluir mensagem' });
  }
});

module.exports = router;
