const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { supabase, config } = require('../config');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const { data: user, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) return res.status(401).json({ message: 'Usuário não encontrado' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ message: 'Senha incorreta' });

    const token = jwt.sign({
      username: user.username,
      role: user.role || 'solicitante',
      nome_completo: user.nome_completo || '',
      setor_id: user.setor_id || null,
    }, config.jwtSecret, { expiresIn: '24h' });

    let setorNome = null;
    if (user.setor_id) {
      const { data: setor } = await supabase.from('locais').select('nome').eq('id', user.setor_id).single();
      setorNome = setor?.nome || null;
    }

    res.json({
      token,
      role: user.role || 'solicitante',
      nome_completo: user.nome_completo || '',
      setor_id: user.setor_id || null,
      setor_nome: setorNome,
    });
  } catch (err) {
    console.error('[AUTH] Erro no login:', err.message);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { username } = req.user;

    const { data: user, error } = await supabase.from('usuarios').select('*').eq('username', username).single();
    if (error || !user) return res.status(401).json({ message: 'Usuário não encontrado' });

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) return res.status(401).json({ message: 'Senha atual incorreta' });

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    const { error: updateError } = await supabase.from('usuarios').update({ password: hashedNewPassword }).eq('username', username);

    if (updateError) return res.status(500).json({ message: 'Erro ao atualizar senha' });
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (err) {
    console.error('[AUTH] Erro ao alterar senha:', err.message);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// POST /api/auth/register
router.post('/register', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { username, password, role, nome_completo, setor_id } = req.body;

    if (!username || !password) return res.status(400).json({ message: 'Username e senha são obrigatórios' });
    if (password.length < 6) return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres' });

    const validRoles = ['admin', 'solicitante', 'tecnico'];
    const userRole = role || 'solicitante';
    if (!validRoles.includes(userRole)) return res.status(400).json({ message: 'Role inválido' });

    const { data: existingUser } = await supabase.from('usuarios').select('*').eq('username', username).single();
    if (existingUser) return res.status(400).json({ message: 'Nome de usuário já existe' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const { error } = await supabase.from('usuarios').insert([{
      username,
      password: hashedPassword,
      role: userRole,
      nome_completo: nome_completo || null,
      setor_id: setor_id || null,
    }]);

    if (error) return res.status(500).json({ message: 'Erro ao criar usuário' });
    res.json({ message: 'Usuário criado com sucesso' });
  } catch (err) {
    console.error('[AUTH] Erro ao registrar:', err.message);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('usuarios')
      .select('username, nome_completo, setor_id, role')
      .eq('username', req.user.username)
      .single();

    if (error || !user) return res.status(404).json({ message: 'Usuário não encontrado' });

    let setorNome = null;
    if (user.setor_id) {
      const { data: setor } = await supabase.from('locais').select('nome').eq('id', user.setor_id).single();
      setorNome = setor?.nome || null;
    }

    res.json({ ...user, setor_nome: setorNome });
  } catch (err) {
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

module.exports = router;
