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
- [x] Testes vitest para routers (21 testes passando)
- [x] Checkpoint final

## Revisão Completa - Replicar PayFlow Original
- [x] Adicionar campo "categoria" em fornecedores
- [x] Adicionar campo "totalMedicoes" (duração) em pedidos
- [x] Adicionar campo "dataVencimento" em medições
- [x] Atualizar queries do backend com KPIs corretos
- [x] Reescrever Visão Geral: KPIs (Pedidos Ativos, Medições Pagas, Medições p/ Criar, Em Atraso)
- [x] Visão Geral: tabela "Medições a Criar Este Mês"
- [x] Visão Geral: tabela "Medições em Atraso"
- [x] Visão Geral: tabela "Pedidos em Andamento" com Progresso e Próx. Medição
- [x] Reescrever Pedidos: colunas Medições (X/Y), Pago, Próx. Medição + filtros por fornecedor e tipo
- [x] Reescrever Medições: KPIs (Esperadas, Criadas, Faltam Criar), Controle por pedido com progresso
- [x] Medições: tabela "Todas as Medições Registradas" com filtro por status
- [x] Reescrever Fornecedores: campo categoria, contagem de pedidos, total acumulado
- [x] Atualizar sidebar: seções PAINEL, FLUXO OPERACIONAL, GESTÃO
- [x] Renomear sistema para PayFlow

## Ajustes
- [x] Valor Previsto na tela de Medições deve mostrar valor por medição (valor pedido / totalMedicoes), não o valor total do pedido
- [x] Tela de Pedidos: adicionar coluna "Consumido" (soma das medições pagas do pedido)
- [x] Visão Geral: mostrar valor consumido na tabela "Pedidos em Andamento"
- [x] Modal de criação de medição: ao selecionar pedido, exibir fornecedor e valor previsto da medição como prévia
- [x] Bug: Medições pendentes aparecem para pedidos cujo dataInicio é posterior ao mês selecionado (ex: pedido iniciado em março aparece como pendente em fevereiro)
- [x] Botão "Criar" nas medições pendentes que abre modal pré-preenchido com dados do pedido (pedidoId, mês, valor previsto)
- [x] Campo "Elemento PEP" no cadastro de pedidos, obrigatório quando tipo de gasto for Capex
- [x] Campo Elemento PEP: máscara e validação no formato CBF.26.001 (3 letras + ponto + 2 dígitos + ponto + 3 dígitos)
- [x] Tela de Relatórios: substituir erro por página "Em Construção"
- [x] Bug: campo Elemento PEP com maxLength incorreto, não aceita CBF.26.015 (9 caracteres)
- [x] Bug persistente: máscara PEP ainda trunca antes de CBF.26.015 - reescrever lógica completamente

## Novas Funcionalidades
- [x] Automação: alterar status do pedido para "Concluído" quando consumido atingir 100%
- [x] Campo "Responsável" no cadastro de pedidos (nome da pessoa responsável por criar as medições)
- [x] Visão gerencial no Dashboard: tabela mostrando responsáveis que ainda não criaram medições do mês
- [x] Visão Geral: filtro por responsável nas tabelas de medições a criar e pedidos em andamento
- [x] Visão Geral: totalizadores por responsável (total de pedidos, valor total, medições pendentes)
- [x] Tela de Medições: adicionar filtro por responsável e exibir coluna responsável nas tabelas
- [x] Visão Geral: filtro de responsável deve filtrar TODAS as seções (KPIs, Medições a Criar, Medições em Atraso, Painel Gerencial, Pedidos em Andamento)
- [x] BUG: Campo de busca global não retorna nenhum resultado
- [x] Acesso público total: remover exigência de login (protectedProcedure = publicProcedure) — ADIADO para próxima fase
- [ ] Tela de login com e-mail/senha — ADIADO para próxima fase
- [ ] Página de Gestão de Usuários (admin): cadastrar, editar, remover acessos e definir papel (admin/usuário) — ADIADO para próxima fase
- [ ] Proteção de rotas: redirecionar para login se não autenticado — ADIADO para próxima fase
