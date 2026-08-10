-- ============================================================
-- 0040 — Baús: conteudo_url dos PDFs (Storage bucket "baus")
--
-- PDFs subidos para o bucket público "baus" (0039), nomeados
-- por bau_modulo<X>_<assunto>.pdf. O client abre o link em nova
-- aba (botão "Acessar conteúdo" na página de Baús).
-- Idempotente: só atualiza as linhas dos 3 baús.
-- ============================================================

update public.bauis b
   set conteudo_url = 'https://orlngwrzfzuxnflcgnum.supabase.co/storage/v1/object/public/baus/bau_modulo1_script_objecao_preco.pdf'
 where b.conquista_gatilho_id = (select id from public.conquistas where codigo = 'modulo_1_completo');

update public.bauis b
   set conteudo_url = 'https://orlngwrzfzuxnflcgnum.supabase.co/storage/v1/object/public/baus/bau_modulo2_template_pop_editavel.pdf'
 where b.conquista_gatilho_id = (select id from public.conquistas where codigo = 'modulo_2_completo');

update public.bauis b
   set conteudo_url = 'https://orlngwrzfzuxnflcgnum.supabase.co/storage/v1/object/public/baus/bau_modulo3_roteiros_instagram_whatsapp.pdf'
 where b.conquista_gatilho_id = (select id from public.conquistas where codigo = 'modulo_3_completo');
