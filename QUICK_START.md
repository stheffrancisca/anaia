# ANAIA v1.0 MVP — QUICK START (5 min)

## Passo 1: Criar Next.js Project

```bash
npx create-next-app@latest anaia-mvp --typescript --no-eslint --no-tailwind
cd anaia-mvp
```

Responda: Use default para tudo, TAILWIND = no

## Passo 2: Instalar Dependências

```bash
npm install \
  @supabase/supabase-js \
  @supabase/ssr \
  openai \
  axios \
  cheerio \
  node-cache
```

## Passo 3: Copiar Arquivos

Copie os arquivos conforme mapeamento em `PROJECT_STRUCTURE.txt`:

**Key files:**
- `app-page.tsx` → `app/page.tsx`
- `api-*.ts` → `app/api/*/route.ts`
- `lib-*.ts` → `lib/**.ts`
- `.env.example` → `.env.local`
- `supabase.sql` → SQL do Supabase
- `package.json` → merge ou npm install deps

## Passo 4: Configurar Supabase (2 min)

```bash
# 1. Go to https://supabase.com → New Project
# 2. Copie Project URL e Anon Key
# 3. SQL Editor → New Query → Colar conteúdo de supabase.sql
# 4. Execute (RUN)
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-... (opcional)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## Passo 5: Rodar

```bash
npm run dev
```

Vai em: http://localhost:3000

## Test It

1. **Sign up:** qualquer email + qualquer senha (6+ chars)
2. **Click:** "Começar Análise"
3. **Fill:**
   - CNPJ: `34.028.317/0001-78` (Supabase Brasil, real)
   - Website: `https://supabase.com`
   - Segmento: `software`
4. **Click:** "Analisar Empresa"
5. **Wait:** 30-60 seg (processamento real: CNPJ lookup + website crawl + AI)
6. **See:** ABVS score + AI Visibility + Financial + Gap + Actions

## Se Erro

**"Supabase não configurado"**
→ Verificar NEXT_PUBLIC_SUPABASE_URL e chaves no .env.local

**"CNPJ não encontrado"**
→ ReceitaWS tem rate limit (30 req/min). Aguardar 30s.

**"OpenAI não configurado"**
→ Normal. Copiar conteúdo de `api-ai-visibility.ts` para testar sem API key.

**"Website não responde"**
→ Alguns sites bloqueiam crawlers. Usar outro.

---

**Status:** ✅ Pronto em 5 minutos

Próximas leituras: `INSTALLATION.md` (detalhado) e `SUMMARY.md` (status)
