-- ===========================================
-- CRIAR TABELAS PARA O SISTEMA DE CHAMADOS
-- ===========================================

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nome_completo TEXT,
    setor_id UUID REFERENCES locais(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de locais/setores
CREATE TABLE IF NOT EXISTS locais (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de logs de chamados
CREATE TABLE IF NOT EXISTS logs_chamados (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    local_id UUID REFERENCES locais(id) ON DELETE CASCADE,
    setor_id UUID REFERENCES locais(id) ON DELETE SET NULL,
    mensagem TEXT NOT NULL,
    descricao TEXT,
    nome_solicitante TEXT,
    local_suporte TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- CRIAR ÍNDICES PARA PERFORMANCE
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_logs_chamados_local_id ON logs_chamados(local_id);
CREATE INDEX IF NOT EXISTS idx_logs_chamados_timestamp ON logs_chamados(timestamp);
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);

-- ===========================================
-- INSERIR USUÁRIO ADMIN
-- ===========================================
-- Login: teste
-- Senha: teste1993
INSERT INTO usuarios (username, password) VALUES ('teste', '$2b$10$tAN812js6QDDnodlIChVMOThRqkYcuZGYsLaBNTKvPyJcj07e8Qva');
