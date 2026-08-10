-- ============================================================
-- 0041 — Flag boas_vindas_vista (perfis)
--
-- Exibição automática da tela de boas-vindas (vídeos institucionais)
-- ao concluir o onboarding, antes da primeira visita à Sala de Guerra.
-- `false` = aluno novo ainda não viu a tela; `true` = já viu (não repete).
--
-- Alunos que já existiam antes desta atualização já concluíram o
-- onboarding, então recebem a flag como true: não são forçados à
-- tela automaticamente — acessam pelo link "Como funciona a
-- plataforma" no rodapé, que funciona a qualquer momento.
-- ============================================================

alter table public.perfis
  add column if not exists boas_vindas_vista boolean not null default false;

update public.perfis
  set boas_vindas_vista = true
  where boas_vindas_vista = false;
