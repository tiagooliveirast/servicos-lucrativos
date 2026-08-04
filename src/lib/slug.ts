/**
 * Slug da página pública: minúsculas, dígitos e hífens — mesma regra do
 * check `perfis_pagina_publica_slug_formato` no banco.
 */
export function slugificar(texto: string | null | undefined): string {
  const base = (texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // tudo que não for letra/dígito vira hífen
    .replace(/^-+|-+$/g, "") // sem hífens nas pontas
    .slice(0, 60);
  return base;
}
