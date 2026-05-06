const express = require('express');
const bcrypt = require('bcryptjs');
const { supabase } = require('../config');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/usuarios
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, username, nome_completo, setor_id, role, created_at')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ message: 'Erro ao buscar usuários' });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// PUT /api/usuarios/:id
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, role, nome_completo, setor_id, newPassword } = req.body;

    if (!username || !role) return res.status(400).json({ message: 'Username e role são obrigatórios' });

    const validRoles = ['admin', 'solicitante', 'tecnico'];
    if (!validRoles.includes(role)) return res.status(400).json({ message: 'Role inválido' });
    if (newPassword && newPassword.length < 6) return res.status(400).json({ message: 'A nova senha deve ter pelo menos 6 caracteres' });

    const updateData = { username, role, nome_completo: nome_completo || null, setor_id: setor_id || null };

    if (newPassword) {
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const { error } = await supabase.from('usuarios').update(updateData).eq('id', id);
    if (error) return res.status(500).json({ message: 'Erro ao atualizar usuário', details: error.message });

    res.json({ message: 'Usuário atualizado com sucesso' });
  } catch (err) {
    console.error('[USUARIOS] Erro ao atualizar:', err.message);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// DELETE /api/usuarios/:id
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('usuarios').delete().eq('id', id);
    if (error) return res.status(500).json({ message: 'Erro ao deletar usuário' });
    res.json({ message: 'Usuário deletado' });
  } catch (err) {
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

module.exports = router;
