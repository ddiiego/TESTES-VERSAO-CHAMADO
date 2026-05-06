const express = require('express');
const { supabase } = require('../config');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/notificacoes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { username, role } = req.user;

    // Notificações diretas
    const { data: diretas, error } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('usuario', username)
      .eq('lida', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    let notificacoes = diretas || [];

    // Técnico/admin: notificações dos chamados que participa
    if (role === 'tecnico' || role === 'admin') {
      const { data: chamados } = await supabase
        .from('logs_chamados')
        .select('id')
        .or(`tecnico_atendimento.eq.${username},tecnicos_adicionais.cs.{${username}}`)
        .neq('status', 'fechado');

      if (chamados && chamados.length > 0) {
        const chamadoIds = chamados.map(c => c.id);
        const { data: notifChamados } = await supabase
          .from('notificacoes')
          .select('*')
          .in('chamado_id', chamadoIds)
          .eq('lida', false)
          .order('created_at', { ascending: false })
          .limit(50);

        if (notifChamados) {
          const todas = [...notificacoes, ...notifChamados];
          const ids = new Set();
          notificacoes = todas.filter(n => {
            if (ids.has(n.id)) return false;
            ids.add(n.id);
            return true;
          });
        }
      }
    }

    res.json(notificacoes);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar notificações' });
  }
});

// PATCH /api/notificacoes/:id/lida
router.patch('/:id/lida', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('id', req.params.id)
      .eq('usuario', req.user.username);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao marcar como lida' });
  }
});

// PATCH /api/notificacoes/todas-lidas
router.patch('/todas-lidas', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('usuario', req.user.username)
      .eq('lida', false);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao marcar todas como lidas' });
  }
});

module.exports = router;
