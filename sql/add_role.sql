-- ===========================================
-- ADICIONAR CAMPO ROLE NA TABELA USUARIOS
-- ===========================================

-- Adicionar coluna role (padrão: solicitante)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'solicitante';

-- Definir valores permitidos
-- admin: acesso total ao dashboard
-- solicitante: pode abrir chamados
-- tecnico: a definir

-- Atualizar usuário admin existente
UPDATE usuarios SET role = 'admin' WHERE username = 'teste';

-- Adicionar constraint para valores específicos
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS check_role;
ALTER TABLE usuarios ADD CONSTRAINT check_role CHECK (role IN ('admin', 'solicitante', 'tecnico'));
