const express = require('express');
const { supabase } = require('../config');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/locais
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('locais').select('*');
    if (error) return res.status(500).json(error);
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// POST /api/locais
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { nome, slug } = req.body;
    const finalSlug = (slug || nome.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, ''));

    const { data: existing } = await supabase.from('locais').select('id').eq('slug', finalSlug).single();
    if (existing) return res.status(400).json({ message: 'Slug já existe. Escolha outro.' });

    const { data, error } = await supabase.from('locais').insert([{ nome, slug: finalSlug }]).select().single();
    if (error) return res.status(500).json(error);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// PUT /api/locais/:id
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, slug } = req.body;
    if (!nome || !slug) return res.status(400).json({ message: 'Nome e slug são obrigatórios' });

    const { error } = await supabase.from('locais').update({ nome, slug }).eq('id', id);
    if (error) return res.status(500).json({ message: 'Erro ao atualizar setor', details: error.message });
    res.json({ message: 'Setor atualizado com sucesso' });
  } catch (err) {
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// DELETE /api/locais/:id
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('locais').delete().eq('id', id);
    if (error) return res.status(500).json({ message: 'Erro ao deletar setor' });
    res.json({ message: 'Setor deletado' });
  } catch (err) {
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

module.exports = router;
