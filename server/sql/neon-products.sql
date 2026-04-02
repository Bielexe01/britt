-- Rode este script no SQL Editor da Neon com uma role dona do banco.
-- Se a role usada pela sua aplicacao nao for "authenticator", troque o nome abaixo.

CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  badge TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT USAGE ON SCHEMA public TO authenticator;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products TO authenticator;

-- Quando a tabela estiver vazia, a propria aplicacao popula os produtos iniciais.
