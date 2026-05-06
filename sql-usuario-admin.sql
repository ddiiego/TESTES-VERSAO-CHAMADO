-- Script para verificar e criar usuário admin
-- Execute no Supabase SQL Editor

-- Verificar usuários existentes
SELECT id, username, role FROM usuarios;

-- Se não houver admin, criar um novo
INSERT INTO usuarios (username, password, role, nome_completo)
VALUES ('admin', '$2a$10$KIXxN3QnKWN5i.Vb6J8mXuQbVxB4HX8.Y9cG1YQqXw5J0fZQwJxFC', 'admin', 'Administrador')
ON CONFLICT (username) DO UPDATE SET role = 'admin';
