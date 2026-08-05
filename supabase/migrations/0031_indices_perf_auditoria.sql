-- Auditoria de performance (itens 17-20): índices que faltavam.
-- Buscas por gatilho de baú e por conquista desbloqueada eram feitas
-- sem índice próprio (só user_id existia indexado).

create index if not exists idx_bauis_conquista_gatilho on public.bauis(conquista_gatilho_id);

create index if not exists idx_conquistas_usuario_conquista on public.conquistas_usuario(conquista_id);
