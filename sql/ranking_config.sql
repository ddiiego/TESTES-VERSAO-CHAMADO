-- Migração: Criar tabela ranking_config
-- Usada pelo sistema de ranking de técnicos

CREATE TABLE IF NOT EXISTS ranking_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resetado_por TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE ranking_config ENABLE ROW LEVEL SECURITY;

-- Permitir acesso via service_role (usado pelo backend)
CREATE POLICY "ranking_config_all" ON ranking_config FOR ALL USING (true);
