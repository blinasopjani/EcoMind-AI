-- Shton kolonën DPR (Shifra e konsumatorit) te tabela bills. E sigurt (idempotente).
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS dpr text;
