const express = require('express');
const { supabase } = require('../config');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sendTelegramNotification, templates } = require('../services/telegram');
const { createNotification, createChatSystemMessage, notifyAdmins, findSolicitanteUsername, getUserFullName } = require('../services/notification');

const router = express.Router();

// --- Helpers de enriquecimento ---

async function enrichChamados(logs) {
  const allLocalIds = [...new Set([
    ...logs.map(l => l.local_id).filter(Boolean),
    ...logs.map(l => l.setor_id).filter(Boolean),
  ])];

  const allUsernames = [...new Set([
    ...logs.map(l => l.tecnico_atendimento).filter(Boolean),
    ...logs.flatMap(l => l.tecnicos_adicionais || []).filter(Boolean),
  ])];

  const [{ data: localesData }, { data: usersData }] = await Promise.all([
    allLocalIds.length > 0 ? supabase.from('locais').select('id, nome').in('id', allLocalIds) : { data: [] },
    allUsernames.length > 0 ? supabase.from('usuarios').select('username, nome_completo').in('username', allUsernames) : { data: [] },
  ]);

  const localesMap = Object.fromEntries((localesData || []).map(l => [l.id, l.nome]));
  const usersMap = Object.fromEntries((usersData || []).map(u => [u.username, u.nome_completo]));

  return (logs || []).map(log => ({
    ...log,
    local_nome: localesMap[log.local_id] || '',
    setor_solicitante: localesMap[log.setor_id] || '',
    tecnico_nome: usersMap[log.tecnico_atendimento] || log.tecnico_atendimento || '',
    tecnicos_adicionais_nomes: (log.tecnicos_adicionais || []).map(u => usersMap[u] || u).filter(Boolean),
  }));
}

// POST /api/chamados/enviar
router.post('/enviar', authenticateToken, async (req, res) => {
  try {
    console.log('[DEBUG] Recebido POST /enviar:', req.body);
    const { local_id, setor_id, mensagem, descricao, nome_solicitante, local_suporte, imagem_url, alerta } = req.body;
    const finalSetorId = setor_id || req.user.setor_id || null;

    if (!mensagem) {
      return res.status(400).json({ message: 'O título/mensagem do chamado é obrigatório' });
    }

    const agora = new Date();
    const horaFormatada = String(agora.getHours()).padStart(2, '0') + String(agora.getMinutes()).padStart(2, '0');
    const { count } = await supabase.from('logs_chamados').select('*', { count: 'exact', head: true });
    const codigoChamado = `${String((count || 0) + 1).padStart(4, '0')}-${horaFormatada}`;

    const { data: novoChamado, error: logError } = await supabase.from('logs_chamados').insert([{
      local_id,
      setor_id: finalSetorId,
      mensagem,
      descricao,
      nome_solicitante,
      local_suporte,
      timestamp: agora.toISOString(),
      status: 'pendente',
      codigo: codigoChamado,
      imagem_url: imagem_url || null,
      alerta: alerta || 'Suporte TI'
    }]).select('id, codigo').single();

    if (logError) {
      console.error('[CHAMADOS] Erro ao salvar:', logError.message);
      return res.status(500).json({ message: 'Erro ao salvar chamado' });
    }

    // Mensagem de sistema no chat com o relato inicial
    await createChatSystemMessage(novoChamado.id, `📋 Chamado aberto por ${nome_solicitante}:\n\n*Assunto:* ${mensagem}\n*Descrição:* ${descricao || 'Sem detalhes adicionais'}`);
    
    // Se houver imagem no chamado, também postar no chat como uma mensagem do próprio usuário (simulado como sistema ou mensagem real)
    // O usuário disse: "ela també deve ser direcionada capara o chat como é a mesagens escrita"
    if (imagem_url) {
      await supabase.from('chat_mensagens').insert([{
        chamado_id: novoChamado.id,
        usuario: req.user.username,
        nome_usuario: req.user.nome_completo || req.user.username,
        role: req.user.role,
        mensagem: '📷 Imagem anexada na abertura do chamado',
        imagem_url: imagem_url,
        visto_por: [{ usuario: req.user.nome_completo || req.user.username, data: agora.toISOString() }]
      }]);
    }

    // Telegram
    const msgTelegram = alerta === 'Retorno' 
      ? templates.retorno(codigoChamado, nome_solicitante, descricao || 'Nenhuma')
      : templates.novoChamado(codigoChamado, nome_solicitante, local_suporte, mensagem);

    if (imagem_url) {
      const { sendTelegramPhoto } = require('../services/telegram');
      await sendTelegramPhoto(imagem_url, msgTelegram);
    } else {
      await sendTelegramNotification(msgTelegram);
    }

    // Notificar Admins
    await notifyAdmins('🚨 Novo Chamado', `${nome_solicitante} abriu o chamado #${codigoChamado}: ${mensagem}`, novoChamado.id);

    res.status(200).send();
  } catch (err) {
    console.error('[CHAMADOS] Erro ao enviar:', err.message);
    res.status(500).json({ message: 'Erro ao enviar chamado' });
  }
});

// POST /api/chamados/:id/retorno
router.post('/:id/retorno', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { mensagem } = req.body;

    if (!mensagem || !mensagem.trim()) return res.status(400).json({ message: 'Mensagem é obrigatória' });

    const { data: chamado, error } = await supabase.from('logs_chamados').select('*').eq('id', id).maybeSingle();
    if (error) return res.status(500).json({ message: 'Erro ao buscar chamado' });
    if (!chamado) return res.status(404).json({ message: 'Chamado não encontrado' });
    if (chamado.status === 'fechado' || chamado.status === 'concluido') {
      return res.status(400).json({ message: 'Não é possível enviar retorno em chamado fechado' });
    }

    const descricaoAtualizada = chamado.descricao
      ? `${chamado.descricao}\n\n🔄 *RETORNO:* ${mensagem}`
      : `🔄 *RETORNO:* ${mensagem}`;

    const { error: updateError } = await supabase.from('logs_chamados').update({ descricao: descricaoAtualizada }).eq('id', id);
    if (updateError) throw updateError;

    await createChatSystemMessage(id, `🔄 Retorno enviado por ${req.user.nome_completo || req.user.username}`);
    await sendTelegramNotification(templates.retorno(chamado.codigo || id, req.user.username, mensagem));

    res.json({ success: true, message: 'Retorno enviado com sucesso' });
  } catch (err) {
    console.error('[CHAMADOS] Erro ao enviar retorno:', err.message);
    res.status(500).json({ message: 'Erro ao enviar retorno' });
  }
});

// GET /api/chamados
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = supabase.from('logs_chamados').select('*').order('timestamp', { ascending: false }).limit(100);

    const { data: usuario } = await supabase.from('usuarios').select('nome_completo').eq('username', req.user.username).single();
    const nomeCompleto = usuario?.nome_completo || '';

    if (req.user.role === 'solicitante') {
      query = query.eq('nome_solicitante', nomeCompleto).neq('status', 'fechado');
    } else if (req.user.role === 'tecnico') {
      query = query.neq('status', 'fechado');
    }

    // Filtro por alerta (Suporte TI / Provas)
    if (req.query.alerta) {
      query = query.eq('alerta', req.query.alerta);
    }

    const { data: logs, error } = await query;
    if (error) return res.status(500).json({ message: 'Erro ao buscar chamados' });

    res.json(await enrichChamados(logs || []));
  } catch (err) {
    console.error('[CHAMADOS] Erro ao listar:', err.message);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// GET /api/chamados-fechados
router.get('-fechados', authenticateToken, async (req, res) => {
  try {
    let query = supabase
      .from('logs_chamados')
      .select('*')
      .in('status', ['fechado', 'concluido'])
      .order('timestamp', { ascending: false })
      .limit(200);

    // Filtro por alerta (Suporte TI / Provas)
    if (req.query.alerta) {
      query = query.eq('alerta', req.query.alerta);
    }

    const { data: logs, error } = await query;

    if (error) return res.status(500).json({ message: 'Erro ao buscar chamados' });

    res.json(await enrichChamados(logs || []));
  } catch (err) {
    console.error('[CHAMADOS] Erro ao listar fechados:', err.message);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// GET /api/tecnicos
router.get('/tecnicos', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('username, nome_completo')
      .in('role', ['tecnico', 'admin'])
      .order('nome_completo', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar técnicos' });
  }
});

// PATCH /api/chamados/:id/atender
router.patch('/:id/atender', authenticateToken, requireRole('tecnico', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from('logs_chamados').update({
      status: 'em_atendimento',
      tecnico_atendimento: req.user.username,
      data_atendimento: new Date().toISOString(),
    }).eq('id', id);

    if (error) throw error;

    const { data: chamado } = await supabase.from('logs_chamados').select('nome_solicitante, codigo').eq('id', id).single();
    const tecnicoNome = await getUserFullName(req.user.username);

    await createChatSystemMessage(id, `👨‍🔧 ${tecnicoNome} iniciou o atendimento`);
    await sendTelegramNotification(templates.emAtendimento(chamado?.codigo || id, tecnicoNome));

    // Notificar solicitante
    const solicitanteUsername = await findSolicitanteUsername(chamado?.nome_solicitante);
    if (solicitanteUsername) {
      await createNotification(solicitanteUsername, '👨‍🔧 Técnico em Caminho', `${tecnicoNome} começou a atender seu chamado #${chamado?.codigo || id}.`, id);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[CHAMADOS] Erro ao atender:', err.message);
    res.status(500).json({ message: 'Erro ao atender chamado' });
  }
});

// PATCH /api/chamados/:id/pedir-ajuda
router.patch('/:id/pedir-ajuda', authenticateToken, requireRole('tecnico', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { novoTecnico } = req.body;

    if (!novoTecnico) return res.status(400).json({ message: 'Selecione um técnico.' });

    const { data: chamado, error: chamadoError } = await supabase
      .from('logs_chamados')
      .select('tecnico_atendimento, tecnicos_adicionais, codigo')
      .eq('id', id).single();

    if (chamadoError) throw chamadoError;

    if (chamado.tecnico_atendimento !== req.user.username && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Apenas o técnico responsável pode adicionar ajuda.' });
    }

    const atuais = chamado.tecnicos_adicionais || [];
    if (atuais.includes(novoTecnico)) return res.status(400).json({ message: 'Este técnico já está no chamado.' });

    const { error } = await supabase.from('logs_chamados').update({ tecnicos_adicionais: [...atuais, novoTecnico] }).eq('id', id);
    if (error) return res.status(500).json({ message: 'Erro ao adicionar técnico: ' + error.message });

    const remetenteNome = await getUserFullName(req.user.username);
    const destinatarioNome = await getUserFullName(novoTecnico);

    await createNotification(novoTecnico, '🤝 Solicitação de Ajuda', `${remetenteNome} pediu sua ajuda no chamado #${chamado?.codigo || id}`, id);
    await createChatSystemMessage(id, `🤝 ${destinatarioNome} foi adicionado ao atendimento`);
    await sendTelegramNotification(templates.tecnicoAdicionado(chamado?.codigo || id, remetenteNome, destinatarioNome));

    res.json({ success: true, message: 'Técnico adicionado com sucesso' });
  } catch (err) {
    console.error('[CHAMADOS] Erro ao pedir ajuda:', err.message);
    res.status(500).json({ message: 'Erro ao adicionar técnico' });
  }
});

// PATCH /api/chamados/:id/diagnostico
router.patch('/:id/diagnostico', authenticateToken, requireRole('tecnico', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { problema } = req.body;

    if (!problema) return res.status(400).json({ message: 'Informe o diagnóstico encontrado.' });

    const { error } = await supabase.from('logs_chamados').update({
      problema_encontrado: problema,
    }).eq('id', id);

    if (error) throw error;

    const { data: chamado } = await supabase.from('logs_chamados').select('codigo, mensagem, descricao').eq('id', id).single();
    const tecnicoNome = await getUserFullName(req.user.username);

    await createChatSystemMessage(id, `🔍 Diagnóstico técnico lançado por ${tecnicoNome}:\n\n*Diagnóstico:* ${problema}`);
    await sendTelegramNotification(templates.diagnostico(chamado?.codigo || id, tecnicoNome, problema, chamado?.mensagem, chamado?.descricao));

    res.json({ success: true, message: 'Diagnóstico salvo com sucesso' });
  } catch (err) {
    console.error('[CHAMADOS] Erro ao lançar diagnóstico:', err.message);
    res.status(500).json({ message: 'Erro ao lançar diagnóstico' });
  }
});

// PATCH /api/chamados/:id/concluir
router.patch('/:id/concluir', authenticateToken, requireRole('tecnico', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { problema, solucao } = req.body;

    const { error } = await supabase.from('logs_chamados').update({
      status: 'solucionado',
      problema_encontrado: problema,
      solucao_aplicada: solucao,
      data_conclusao: new Date().toISOString(),
    }).eq('id', id);

    if (error) throw error;

    const { data: chamado } = await supabase.from('logs_chamados').select('nome_solicitante, codigo, mensagem, descricao').eq('id', id).single();
 
    await createChatSystemMessage(id, `✅ Solução enviada — aguardando validação:\n\n*Diagnóstico:* ${problema}\n*Solução:* ${solucao}`);
    await sendTelegramNotification(templates.solucionado(chamado?.codigo || id, problema, solucao, chamado?.mensagem, chamado?.descricao));

    res.json({ success: true });
  } catch (err) {
    console.error('[CHAMADOS] Erro ao concluir:', err.message);
    res.status(500).json({ message: 'Erro ao concluir chamado' });
  }
});

// PATCH /api/chamados/:id/atualizar-solucao
router.patch('/:id/atualizar-solucao', authenticateToken, requireRole('tecnico', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { problema, solucao } = req.body;

    const { data: chamadoAtual } = await supabase.from('logs_chamados').select('status, codigo, mensagem, descricao').eq('id', id).single();
    const isReenvio = chamadoAtual?.status === 'solucao_negada';

    const { error } = await supabase.from('logs_chamados').update({
      status: 'solucionado',
      problema_encontrado: problema,
      solucao_aplicada: solucao,
      data_conclusao: new Date().toISOString(),
    }).eq('id', id);

    if (error) throw error;

    const msgChat = isReenvio 
      ? `📝 Nova solução enviada — aguardando validação:\n\n*Diagnóstico:* ${problema}\n*Solução:* ${solucao}`
      : `📝 Solução atualizada — aguardando validação:\n\n*Diagnóstico:* ${problema}\n*Solução:* ${solucao}`;
    await createChatSystemMessage(id, msgChat);

    const tmpl = isReenvio ? templates.solucionado : templates.solucaoAtualizada;
    await sendTelegramNotification(tmpl(chamadoAtual?.codigo || id, problema, solucao, chamadoAtual?.mensagem, chamadoAtual?.descricao));

    res.json({ success: true });
  } catch (err) {
    console.error('[CHAMADOS] Erro ao atualizar solução:', err.message);
    res.status(500).json({ message: 'Erro ao atualizar solução' });
  }
});

// PATCH /api/chamados/:id/validar
router.patch('/:id/validar', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nota, aprovado, observacao } = req.body;
    const userRole = req.user.role;

    if (userRole === 'admin') {
      if (!nota || nota < 1 || nota > 6) return res.status(400).json({ message: 'Nota deve ser entre 1 e 6' });

      const { data: chamado } = await supabase.from('logs_chamados').select('status, codigo').eq('id', id).single();
      const novoStatus = aprovado ? (chamado?.status === 'solucionado' ? 'concluido' : 'fechado') : 'solucao_negada';

      const { error } = await supabase.from('logs_chamados').update({
        status: novoStatus,
        nota_validacao: nota,
        observacao_validacao: observacao || null,
        data_validacao: new Date().toISOString(),
      }).eq('id', id);

      if (error) throw error;

      if (novoStatus === 'fechado') {
        await createChatSystemMessage(id, `🔒 Chamado fechado pelo administrador`);
        await sendTelegramNotification(templates.fechado(chamado?.codigo || id, nota));
      } else if (novoStatus === 'concluido') {
        await createChatSystemMessage(id, `⭐ Chamado concluído — Nota: ${nota}/6`);
        await sendTelegramNotification(templates.concluido(chamado?.codigo || id, nota));
      } else {
        await createChatSystemMessage(id, `❌ Solução reprovada pelo administrador`);
        await sendTelegramNotification(templates.solucaoNegada(chamado?.codigo || id, req.user.username));
      }

      res.json({ success: true, message: novoStatus === 'concluido' ? 'Chamado concluído' : 'Chamado fechado' });
    } else if (userRole === 'solicitante') {
      if (aprovado) {
        if (!nota || nota < 1 || nota > 6) return res.status(400).json({ message: 'Nota deve ser entre 1 e 6' });

        const { error } = await supabase.from('logs_chamados').update({
          status: 'concluido',
          nota_validacao: nota,
          observacao_validacao: observacao || null,
          data_validacao: new Date().toISOString(),
        }).eq('id', id);

        if (error) throw error;

        const { data: chamado } = await supabase.from('logs_chamados').select('codigo').eq('id', id).single();
        await createChatSystemMessage(id, `⭐ Solicitante aprovou — Nota: ${nota}/6`);
        await sendTelegramNotification(templates.concluido(chamado?.codigo || id, nota));

        res.json({ success: true, message: 'Atendimento aprovado com sucesso' });
      } else {
        const { error } = await supabase.from('logs_chamados').update({
          status: 'solucao_negada',
          problema_encontrado: null,
          solucao_aplicada: null,
          data_conclusao: null,
        }).eq('id', id);

        if (error) throw error;

        const { data: chamado } = await supabase.from('logs_chamados').select('codigo').eq('id', id).single();
        await createChatSystemMessage(id, `❌ Solução reprovada — requer novo atendimento`);
        await sendTelegramNotification(templates.solucaoNegada(chamado?.codigo || id, req.user.username));

        res.json({ success: true, message: 'Solução negada com sucesso' });
      }
    } else {
      return res.status(403).json({ message: 'Acesso negado' });
    }
  } catch (err) {
    console.error('[CHAMADOS] Erro ao validar:', err.message);
    res.status(500).json({ message: 'Erro ao validar chamado' });
  }
});

// PATCH /api/chamados/:id/reabrir
router.patch('/:id/reabrir', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from('logs_chamados').update({
      status: 'pendente',
      nota_validacao: null,
      data_validacao: null,
    }).eq('id', id);

    if (error) throw error;

    const { data: chamado } = await supabase.from('logs_chamados').select('codigo').eq('id', id).single();
    await createChatSystemMessage(id, `♻️ Chamado reaberto pelo administrador`);
    await sendTelegramNotification(templates.reaberto(chamado?.codigo || id, req.user.username));

    res.json({ success: true });
  } catch (err) {
    console.error('[CHAMADOS] Erro ao reabrir:', err.message);
    res.status(500).json({ message: 'Erro ao reabrir chamado' });
  }
});

// PATCH /api/chamados/:id/editar-relato
router.patch('/:id/editar-relato', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { mensagem, descricao } = req.body;

    const { data: chamado, error: fetchError } = await supabase.from('logs_chamados').select('*').eq('id', id).single();
    if (fetchError || !chamado) return res.status(404).json({ message: 'Chamado não encontrado' });

    // Validar permissão: Admin ou o próprio Solicitante
    const solicitanteUsername = await findSolicitanteUsername(chamado.nome_solicitante);
    const isOwner = solicitanteUsername === req.user.username;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Você não tem permissão para editar este chamado.' });
    }

    const { error: updateError } = await supabase.from('logs_chamados').update({
      mensagem: mensagem || chamado.mensagem,
      descricao: descricao || chamado.descricao,
      data_edicao_relato: new Date().toISOString()
    }).eq('id', id);

    if (updateError) throw updateError;

    const editorNome = await getUserFullName(req.user.username);
    const descFinal = (descricao || chamado.descricao);

    // Montar mensagem de chat inteligente: se for planilha, exibir legenda + JSON para renderização
    let descParaChat = descFinal;
    let excelBlocoJson = null;
    try {
      if (typeof descFinal === 'string' && descFinal.startsWith('{"__isExcel":true')) {
        const excelObj = JSON.parse(descFinal);
        descParaChat = excelObj.caption || null;
        excelBlocoJson = JSON.stringify(excelObj);
      }
    } catch (e) {
      // Não é JSON, manter como texto
    }

    let chatMsg = `📝 Relato editado por ${editorNome}:\n\n*Novo Título:* ${mensagem || chamado.mensagem}`;
    if (descParaChat) {
      chatMsg += `\n*Legenda:* ${descParaChat}`;
    }
    if (excelBlocoJson) {
      chatMsg += `\n${excelBlocoJson}`;
    }
    await createChatSystemMessage(id, chatMsg);
    
    // Telegram
    await sendTelegramNotification(`📝 *Relato Editado*\n\nO chamado #${chamado.codigo || id} foi atualizado por ${editorNome}.\n\n*Novo Título:* ${mensagem || chamado.mensagem}\n*Conteúdo:* ${(descricao || chamado.descricao)?.substring(0, 200)}...`);

    res.json({ success: true, message: 'Relato atualizado com sucesso' });
  } catch (err) {
    console.error('[CHAMADOS] Erro ao editar relato:', err.message);
    res.status(500).json({ message: 'Erro ao editar relato' });
  }
});

// DELETE /api/chamados/:id
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const { data: chamado, error: fetchError } = await supabase.from('logs_chamados').select('*').eq('id', id).maybeSingle();
    if (fetchError) return res.status(500).json({ message: 'Erro ao buscar chamado' });
    if (!chamado) return res.status(404).json({ message: 'Chamado não encontrado' });

    // Buscar imagens do chat para remover do storage
    const { data: msgsComImagem } = await supabase
      .from('chat_mensagens')
      .select('imagem_url')
      .eq('chamado_id', id)
      .not('imagem_url', 'is', null);

    if (msgsComImagem && msgsComImagem.length > 0) {
      const paths = msgsComImagem.map(m => m.imagem_url.split('/').pop()).filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from('chamados-anexos').remove(paths);
      }
    }

    // Remover imagem do próprio chamado se houver
    if (chamado.imagem_url) {
      try {
        const path = chamado.imagem_url.split('/').pop();
        await supabase.storage.from('chamados-anexos').remove([path]);
      } catch (e) {
        console.error('[CHAMADOS] Erro ao remover imagem do chamado:', e.message);
      }
    }

    // Excluir mensagens do chat antes do chamado
    await supabase.from('chat_mensagens').delete().eq('chamado_id', id);

    const { error } = await supabase.from('logs_chamados').delete().eq('id', id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('[CHAMADOS] Erro ao excluir:', err.message);
    res.status(500).json({ message: 'Erro ao excluir chamado' });
  }
});

module.exports = router;
