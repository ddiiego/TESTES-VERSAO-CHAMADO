-- Adicionar colunas para sistema de status dos chamados
-- Execute este SQL no Supabase SQL Editor

ALTER TABLE logs_chamados 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS tecnico_atendimento TEXT,
ADD COLUMN IF NOT EXISTS data_atendimento TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS problema_encontrado TEXT,
ADD COLUMN IF NOT EXISTS solucao_aplicada TEXT,
ADD COLUMN IF NOT EXISTS data_conclusao TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS nota_validacao INTEGER,
ADD COLUMN IF NOT EXISTS observacao_validacao TEXT,
ADD COLUMN IF NOT EXISTS data_validacao TIMESTAMP WITH TIME ZONE;

-- Opcional: Criar índice para buscar por status
CREATE INDEX IF NOT EXISTS idx_logs_chamados_status ON logs_chamados(status);
