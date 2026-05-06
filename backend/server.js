/**
 * Sistema de Chamados — Entry Point
 * Backend modular com Express + Supabase
 */
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { config, supabase } = require('./src/config');
const { requestLogger } = require('./src/middleware/logger');

const app = express();

// --- Middlewares globais ---
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(requestLogger);

// --- Montagem de rotas ---
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/usuarios', require('./src/routes/usuarios'));
app.use('/api/locais', require('./src/routes/locais'));
app.use('/api/chamados', require('./src/routes/chamados'));
app.use('/api/chamados', require('./src/routes/chat'));
app.use('/api/notificacoes', require('./src/routes/notificacoes'));
app.use('/api/ranking', require('./src/routes/ranking'));

// Rota de chamados fechados (montada como /api/chamados-fechados)
const chamadosRouter = require('./src/routes/chamados');
app.get('/api/chamados-fechados', (req, res, next) => {
  // Redireciona internamente para o handler correto
  req.url = '-fechados';
  chamadosRouter(req, res, next);
});

// Rota de tecnicos
app.get('/api/tecnicos', (req, res, next) => {
  req.url = '/tecnicos';
  chamadosRouter(req, res, next);
});

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Inicialização ---
async function initializeDatabase() {
  try {
    // Verificar/criar admin padrão
    const { data: adminExists } = await supabase
      .from('usuarios')
      .select('username')
      .eq('username', 'admin')
      .maybeSingle();

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await supabase.from('usuarios').insert([{
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        nome_completo: 'Administrador',
      }]);
      console.log('[INIT] Usuário admin padrão criado (senha: admin123)');
    }

    // Verificar tabela ranking_config
    const { error: rankingError } = await supabase.from('ranking_config').select('id').limit(1);
    if (rankingError && rankingError.code === '42P01') {
      console.log('[INIT] Tabela ranking_config não encontrada — crie via migração SQL');
    }

    console.log('[INIT] Banco de dados verificado');
  } catch (err) {
    console.error('[INIT] Erro na inicialização:', err.message);
  }
}

async function start() {
  await initializeDatabase();

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`[SERVER] Rodando em http://0.0.0.0:${config.port}`);
  });
}

start();
