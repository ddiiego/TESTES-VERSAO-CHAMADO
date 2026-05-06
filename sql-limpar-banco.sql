-- Limpar banco e criar usuário admin teste
-- Execute este SQL no Supabase SQL Editor

-- 1. Deletar todos os logs de chamados
DELETE FROM logs_chamados;

-- 2. Deletar todos os locais
DELETE FROM locais;

-- 3. Atualizar usuário teste para admin
UPDATE usuarios 
SET password = '$2a$10$rVKLYX.n4mJNQ5gFZvHmbuQbVxB4HX8.Y9cG1YQqXw5J0fZQwJxFC',
    role = 'admin',
    nome_completo = 'Teste Admin'
WHERE username = 'teste';
