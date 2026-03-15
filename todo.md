# FlowMeasure - TODO

## Backend
- [x] Schema do banco: tabelas fornecedores, pedidos, medicoes
- [x] Migrations e aplicação no banco
- [x] CRUD de fornecedores (server/db.ts + routers.ts)
- [x] CRUD de pedidos (server/db.ts + routers.ts)
- [x] CRUD de medições (server/db.ts + routers.ts)
- [x] Endpoint de dashboard (KPIs + dados para gráficos)
- [x] Endpoint de relatórios (implementado mas página não criada - cancelado pelo usuário)

## Frontend - Estilos e Layout
- [x] Configurar fontes Syne + DM Sans no index.html
- [x] Configurar tema claro com cores FlowMeasure no index.css
- [x] Criar componente DashboardLayout customizado (Sidebar + Topbar)
- [x] Sidebar com logo FlowMeasure e navegação
- [x] Topbar com busca, notificações e perfil do usuário

## Frontend - Componentes Compartilhados
- [x] StatusBadge (Ativo/Inativo/Suspenso/Pendente/Pago/Cancelado)
- [x] KPICard (card de indicador com ícone e valor)
- [x] DataTable (tabela com ordenação e ações)

## Frontend - Modais
- [x] FornecedorModal (criar e editar fornecedor)
- [x] PedidoModal (criar e editar pedido)
- [x] MedicaoModal (criar e editar medição)
- [x] PagarMedicaoModal (confirmação de pagamento com nº documento)

## Frontend - Páginas
- [x] Dashboard (KPIs + gráficos + tabela medições recentes)
- [x] Fornecedores (tabela com CRUD completo)
- [x] Pedidos (tabela com CRUD completo)
- [x] Medições (seletor de período 3 seções + tabela)
- [ ] Relatórios (cancelado pelo usuário)

## Integração e Testes
- [x] Rotas configuradas no App.tsx
- [x] Testes vitest para routers (13 testes passando)
- [x] Checkpoint final
