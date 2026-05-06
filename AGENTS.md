# Sistema de Chamados - Documentação

## Visão Geral
Sistema de gestão de chamados de suporte técnico com autenticação, múltiplos níveis de acesso e fluxo de validação.

## Estrutura do Projeto
```
├── frontend/          # React + TypeScript + Vite
│   ├── src/
│   │   ├── api.ts    # Configuração da API
│   │   ├── App.tsx   # Rotas principais
│   │   └── pages/    # Páginas do sistema
│   └── .env.local    # Variáveis locais (não versionar)
├── backend/          # Node.js + Express
│   └── server.js     # API principal
├── api/              # Backup/versão alternativa da API
└── .env              # Variáveis de ambiente globais
```

## Variáveis de Ambiente

### Backend (.env)
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=sb_publishable_xxx
JWT_SECRET=chave_secreta_jwt
PORT=8080
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_CHAT_ID=xxx
```

### Frontend (frontend/.env.local)
```
VITE_API_URL=http://localhost:8080
# Para acesso na rede local: VITE_API_URL=http://192.168.x.x:8080
```

## Roles e Permissões

| Role       | Acesso                                      |
|------------|---------------------------------------------|
| admin      | Gerência, usuários, setores, fechar       |
| tecnico    | Atender, solucionar, reenviar solução     |
| solicitante| Solicitar, validar solução                 |

## Fluxo de Status dos Chamados

```
pendente → em_atendimento → solucionado → concluido → fechado
                    ↓                   ↓
              (reprovar)         solucao_negada → em_atendimento
```

## Rotas da API

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/change-password` - Alterar senha
- `GET /api/auth/me` - Dados do usuário logado

### Chamados
- `GET /api/chamados` - Listar chamados (filtrado por role)
- `POST /api/chamados/enviar` - Criar chamado
- `PATCH /api/chamados/:id/atender` - Atender chamado
- `PATCH /api/chamados/:id/concluir` - Lancar solução
- `PATCH /api/chamados/:id/atualizar-solucao` - Atualizar solução
- `PATCH /api/chamados/:id/validar` - Validar/fechar chamado
- `PATCH /api/chamados/:id/reabrir` - Reabrir chamado (admin)
- `DELETE /api/chamados/:id` - Excluir chamado (admin)

### Locais
- `GET /api/locais` - Listar locais
- `POST /api/locais` - Criar local (admin)
- `PUT /api/locais/:id` - Editar local (admin)
- `DELETE /api/locais/:id` - Excluir local (admin)

### Usuários
- `GET /api/usuarios` - Listar usuários (admin)
- `PUT /api/usuarios/:id` - Editar usuário (admin)
- `DELETE /api/usuarios/:id` - Excluir usuário (admin)

## Executando o Projeto

### Backend
```bash
cd backend
npm install
npm start
# Servidor roda em http://localhost:8080
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Frontend roda em http://localhost:5173
```

## Tabela logs_chamados - Colunas
- id, local_id, setor_id, mensagem, descricao
- nome_solicitante, local_suporte, timestamp
- status (pendente/em_atendimento/solucionado/solucao_negada/concluido/fechado)
- tecnico_atendimento, data_atendimento
- problema_encontrado, solucao_aplicada, data_conclusao
- nota_validacao, data_validacao

## Boas Práticas Implementadas
- Validação de dados no backend
- Variáveis de ambiente para configurações
- Tratamento de erros centralizado
- Autenticação via JWT
- Separacao de responsabilidades por role