const express = require('express');
const { supabase } = require('../config');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * Calcula médias de avaliação para um técnico em diferentes períodos.
 * Respeita a data de início do período de ranking (reset do admin).
 */
async function calcularMedias(username, periodoInicio) {
  const agora = new Date();
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString();
  const inicio7dias = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const inicio30dias = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const inicio180dias = new Date(agora.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString();

  // Data efetiva: o mais recente entre o período de ranking e o limite do cálculo
  const efetivo = (limite) => periodoInicio > limite ? periodoInicio : limite;

  // Buscar todos os chamados com nota dentro do período ativo
  const { data: chamados, error } = await supabase
    .from('logs_chamados')
    .select('nota_validacao, data_validacao')
    .eq('tecnico_atendimento', username)
    .not('nota_validacao', 'is', null)
    .gte('data_validacao', periodoInicio);

  if (error || !chamados) return { media_diaria: 0, media_semanal: 0, media_mensal: 0, media_semestral: 0, total_chamados: 0, chamados_mes: 0 };

  const calcMedia = (items) => {
    if (items.length === 0) return 0;
    const soma = items.reduce((acc, c) => acc + c.nota_validacao, 0);
    return Math.round((soma / items.length) * 10) / 10;
  };

  const hoje = chamados.filter(c => c.data_validacao >= inicioHoje);
  const semana = chamados.filter(c => c.data_validacao >= efetivo(inicio7dias));
  const mes = chamados.filter(c => c.data_validacao >= efetivo(inicio30dias));
  const semestre = chamados.filter(c => c.data_validacao >= efetivo(inicio180dias));

  return {
    media_diaria: calcMedia(hoje),
    media_semanal: calcMedia(semana),
    media_mensal: calcMedia(mes),
    media_semestral: calcMedia(semestre),
    total_chamados: chamados.length,
    chamados_mes: mes.length,
  };
}

/**
 * Retorna a data de início do período de ranking ativo.
 */
async function getPeriodoInicio() {
  const { data } = await supabase
    .from('ranking_config')
    .select('periodo_inicio')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Se não existe config, usa data muito antiga (sem filtro)
  return data?.periodo_inicio || '2000-01-01T00:00:00.000Z';
}

// GET /api/ranking — Admin vê todos os técnicos
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const periodoInicio = await getPeriodoInicio();

    const { data: tecnicos, error } = await supabase
      .from('usuarios')
      .select('username, nome_completo')
      .in('role', ['tecnico', 'admin'])
      .order('nome_completo', { ascending: true });

    if (error) throw error;

    const ranking = await Promise.all(
      (tecnicos || []).map(async (t) => {
        const medias = await calcularMedias(t.username, periodoInicio);
        return {
          username: t.username,
          nome_completo: t.nome_completo || t.username,
          ...medias,
        };
      })
    );

    // Ordenar por média mensal (descendente)
    ranking.sort((a, b) => b.media_mensal - a.media_mensal);

    res.json({ tecnicos: ranking, periodo_inicio: periodoInicio });
  } catch (err) {
    console.error('[RANKING] Erro ao buscar ranking:', err.message);
    res.status(500).json({ message: 'Erro ao buscar ranking' });
  }
});

// GET /api/meu-desempenho — Técnico vê apenas suas notas
router.get('/meu-desempenho', authenticateToken, async (req, res) => {
  try {
    const periodoInicio = await getPeriodoInicio();
    const medias = await calcularMedias(req.user.username, periodoInicio);

    res.json({
      username: req.user.username,
      nome_completo: req.user.nome_completo || req.user.username,
      ...medias,
      periodo_inicio: periodoInicio,
    });
  } catch (err) {
    console.error('[RANKING] Erro ao buscar desempenho:', err.message);
    res.status(500).json({ message: 'Erro ao buscar desempenho' });
  }
});

// POST /api/ranking/reset — Admin reseta o período (preserva histórico)
router.post('/reset', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('ranking_config').insert([{
      periodo_inicio: new Date().toISOString(),
      resetado_por: req.user.username,
    }]);

    if (error) throw error;

    res.json({ success: true, message: 'Período de ranking resetado com sucesso' });
  } catch (err) {
    console.error('[RANKING] Erro ao resetar:', err.message);
    res.status(500).json({ message: 'Erro ao resetar ranking' });
  }
});

// DELETE /api/ranking/limpar — Admin limpa notas dos chamados (irreversível)
router.delete('/limpar', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const periodoInicio = await getPeriodoInicio();

    const { error } = await supabase
      .from('logs_chamados')
      .update({ nota_validacao: null, observacao_validacao: null })
      .not('nota_validacao', 'is', null)
      .gte('data_validacao', periodoInicio);

    if (error) throw error;

    // Também reseta o período
    await supabase.from('ranking_config').insert([{
      periodo_inicio: new Date().toISOString(),
      resetado_por: req.user.username,
    }]);

    res.json({ success: true, message: 'Notas limpas e período resetado' });
  } catch (err) {
    console.error('[RANKING] Erro ao limpar:', err.message);
    res.status(500).json({ message: 'Erro ao limpar ranking' });
  }
});

module.exports = router;
