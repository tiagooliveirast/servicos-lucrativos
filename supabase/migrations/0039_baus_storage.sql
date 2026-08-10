-- ============================================================
-- 0039 — Storage para o conteúdo dos Baús (PDFs)
--
-- Bucket PÚBLICO: o conteúdo dos baús é material bônus
-- (templates, POP, checklist) — sem dado sensível, e o client
-- abre o conteudo_url direto em nova aba (sem signed URL).
-- Admin (postgres/supabase_admin) faz upload; leitura pública.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('baus', 'baus', true)
on conflict (id) do nothing;

-- Só o admin autenticado pode subir/editar arquivos
drop policy if exists "admin_gerencia_arquivos_baus" on storage.objects;
create policy "admin_gerencia_arquivos_baus" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'baus'
    and public.eh_admin()
  )
  with check (
    bucket_id = 'baus'
    and public.eh_admin()
  );

-- Leitura pública (bucket public já permite via anon, mas a política
-- explícita deixa o comportamento registrado e à prova de mudanças)
drop policy if exists "todos_leem_arquivos_baus" on storage.objects;
create policy "todos_leem_arquivos_baus" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'baus');
