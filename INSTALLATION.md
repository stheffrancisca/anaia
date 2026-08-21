# ANAIA v1.0 MVP — Instalação & Setup

## Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta Supabase (grátis)
- OpenAI API key (opcional, mas recomendado)

## Passo 1: Criar Projeto Next.js

```bash
npx create-next-app@latest anaia-mvp --typescript --tailwind --eslint
cd anaia-mvp
```

Responda as perguntas (use padrões, com Tailwind = no)

## Passo 2: Copiar Arquivos

Copiar os arquivos criados para a estrutura correta:

```
app/
  ├── page.tsx → app-page.tsx
  ├── api/
  │   ├── company/
  │   │   └── lookup/
  │   │       └── route.ts → api-company-lookup.ts
  │   ├── website/
  │   │   └── analyze/
  │   │       └── route.ts → api-website-analyze.ts
  │   ├── ai-visibility/
  │   │   └── analyze/
  │   │       └── route.ts → api-ai-visibility.ts
  │   └── diagnose/
  │       └── route.ts → api-diagnose.ts
lib/
  ├── supabase.ts → lib-supabase.ts
  ├── providers.ts → lib-providers.ts
  └── scoring.ts → lib-scoring.ts
```

## Passo 3: Instalar Dependências

```bash
npm install @supabase/supabase-js @supabase/ssr openai axios cheerio node-cache
```

## Passo 4: Configurar Supabase

1. Ir a https://supabase.com
2. Criar projeto novo
3. Ir a "SQL Editor" → "New Query"
4. Colar conteúdo de `supabase.sql`
5. Executar
6. Copiar `Project URL` e `Anon Key` das settings

## Passo 5: Configurar .env.local

```bash
cp .env.example .env.local
```

Editar `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxx...
OPENAI_API_KEY=sk-xxx...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

**Nota:** OpenAI é opcional. Sem ela, AI Visibility retornará erro "NOT_CONFIGURED", mas resto funciona.

## Passo 6: Rodar Localmente

```bash
npm run dev
```

Acessar: http://localhost:3000

## Teste Completo

1. Sign up com email/senha
2. Click "Começar Análise"
3. Informar:
   - CNPJ: 11.222.333/0001-81 (empresa real)
   - Website: https://www.seusite.com.br
   - Segmento: software
4. Click "Analisar Empresa"
5. Aguardar processamento (30-60 segundos)
6. Ver resultado com ABVS, AI Visibility, etc

## O Que Funciona Agora (Real)

✅ Supabase Auth real
✅ CNPJ lookup real (ReceitaWS API pública)
✅ Website analysis real (crawler cheerio)
✅ OpenAI AI Visibility (se key configurada)
✅ Scoring engines (ABVS, Financial, Gap, etc)
✅ Persistência no Supabase
✅ Dark mode glassmorphism

## O Que Ainda Está Mock

⚠️ Competitive Position (fixado em random)
⚠️ Digital Authority (calculado via website, não real)
⚠️ Competitors (descoberta futura)
⚠️ Financial data (apenas manual do usuário, não Receita Federal API)

## Deploy (Vercel)

```bash
git push origin main
# Ir a Vercel → Add project → conectar repo
# Adicionar env vars
# Deploy automático
```

## Troubleshooting

**Erro: "CNPJ não encontrado"**
→ ReceitaWS tem limite de requisições. Esperar 30s e tentar novamente.

**Erro: "OpenAI não configurado"**
→ Normal se não tiver API key. Outras análises funcionam.

**Erro: "Supabase não configurado"**
→ Verificar NEXT_PUBLIC_SUPABASE_URL e chaves no .env.local

**Erro: "website não responde"**
→ Alguns sites bloqueiam crawlers. Tentar com site público.

---

**Status:** Código pronto. Basta seguir passos acima.
