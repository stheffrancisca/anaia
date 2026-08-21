# ANAIA v1.0 MVP — ÍNDICE COMPLETO

## 📚 Leia Nesta Ordem

### 1. **QUICK_START.md** (5 min read)
Instruções rápidas para colocar funcionando em 10 minutos.
- Criar project Next.js
- Instalar deps
- Configurar Supabase
- Rodar `npm run dev`

### 2. **INSTALLATION.md** (20 min read)
Guia detalhado com troubleshooting.
- Pré-requisitos
- Setup passo-a-passo
- Teste completo
- Troubleshooting

### 3. **SUMMARY.md** (10 min read)
Status executivo do projeto.
- O que foi implementado
- Integrações reais vs mock
- Arquitetura
- Limitações conhecidas
- Próximos passos

### 4. **PROJECT_STRUCTURE.txt** (reference)
Mapa visual de onde cada arquivo vai.

---

## 📁 ARQUIVOS DE CÓDIGO

### Backend (API Routes)

#### `api-company-lookup.ts`
- **Função:** Lookup real de CNPJ via ReceitaWS
- **Endpoint:** POST /api/company/lookup
- **Input:** { cnpj: string }
- **Output:** CompanyData (nome, status, abertura, CNAE, etc)
- **Real/Mock:** ✅ REAL (ReceitaWS API)

#### `api-website-analyze.ts`
- **Função:** Análise de website via crawler
- **Endpoint:** POST /api/website/analyze
- **Input:** { url: string }
- **Output:** WebsiteAnalysis (title, description, h1, word_count, structured_data, etc)
- **Real/Mock:** ✅ REAL (Cheerio crawler)

#### `api-ai-visibility.ts`
- **Função:** Gera observações de visibilidade em IA
- **Endpoint:** POST /api/ai-visibility/analyze
- **Input:** { company, website, segment, competitors }
- **Output:** AIObservation[] (com presence, recommendation, position, etc)
- **Real/Mock:** ⚠️ REAL (OpenAI) — Precisa OPENAI_API_KEY

#### `api-diagnose.ts`
- **Função:** Orquestrador completo — faz toda análise
- **Endpoint:** POST /api/diagnose
- **Input:** { cnpj, website, segment, revenue?, ebitda?, debt? }
- **Output:** DiagnosticResult (ABVS, AI Visibility, Financial, Gap, Actions, etc)
- **Fluxo:** Company → Website → AI Visibility → Scoring → Return
- **Real/Mock:** ✅ REAL (orquestra APIs reais)

### Libraries (Backend Utils)

#### `lib-supabase.ts`
- **Função:** Cliente Supabase (auth + admin)
- **Exports:** `supabaseAdmin`, `supabase`
- **Uso:** Em API routes para persistência e auth

#### `lib-providers.ts`
- **Função:** Classes abstratas de providers desacoplados
- **Classes:**
  - `RealCompanyDataProvider` (CNPJ lookup)
  - `RealWebsiteAnalysisProvider` (crawling)
  - `ICompanyDataProvider`, `IWebsiteAnalysisProvider` (interfaces)
- **Padrão:** Trocar provider sem alterar frontend

#### `lib-scoring.ts`
- **Função:** Motores de cálculo (ABVS, Financial, AI Visibility, Gap, Action Plan)
- **Classes:**
  - `FinancialStrengthCalculator` — score financeiro
  - `AIVisibilityCalculator` — agregação de observações
  - `ABVSEngine` — cálculo do score principal
  - `GapCalculator` — Financial - AI Visibility
  - `ActionPlanGenerator` — gera 5 ações
- **Real/Mock:** ✅ REAL (nunca inventa dados)

### Frontend

#### `app-page.tsx`
- **Função:** App React completo (5 páginas)
- **Size:** 30KB
- **Componentes:**
  - `LoginPage` — Supabase Auth
  - `DashboardPage` — Menu principal
  - `DiagnosisInputPage` — Formulário CNPJ/Website/Segmento
  - `ProcessingPage` — Progress bar visual
  - `ResultPage` — 2 abas (overview + detailed)
- **State:** User, page, result, loading
- **Estilos:** Glassmorphism inline (sem Tailwind)
- **Português:** 100%

### Database

#### `supabase.sql`
- **Função:** Schema SQL + RLS policies
- **Tabelas:**
  - `profiles` — Usuários
  - `companies` — Empresas
  - `financial_data` — Dados financeiros
  - `website_analysis` — Análise de website
  - `ai_observations` — Observações de IA
  - `competitors` — Concorrentes
  - `diagnostics` — Resultados finais
  - `action_items` — Plano de ação
- **RLS:** Ativa em todas as tabelas
- **Função:** Execute no SQL Editor do Supabase

### Configuration

#### `package.json`
- **Função:** Dependencies
- **Packages principais:**
  - next@14, react@18, typescript@5
  - @supabase/supabase-js, @supabase/ssr
  - openai, axios, cheerio, node-cache
- **Scripts:** dev, build, start, lint

#### `.env.example`
- **Função:** Template de variáveis de ambiente
- **Copiar para:** `.env.local`
- **Obrigatórias:**
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY
- **Opcionais:**
  - OPENAI_API_KEY

---

## 📊 FLUXO DE DADOS

```
Frontend (React)
    ↓
POST /api/diagnose
    ↓
    ├→ POST /api/company/lookup (ReceitaWS)
    ├→ POST /api/website/analyze (Cheerio)
    ├→ POST /api/ai-visibility/analyze (OpenAI)
    ├→ FinancialStrengthCalculator (lib-scoring)
    ├→ AIVisibilityCalculator (lib-scoring)
    ├→ ABVSEngine (lib-scoring)
    ├→ GapCalculator (lib-scoring)
    └→ ActionPlanGenerator (lib-scoring)
    ↓
JSON Response (DiagnosticResult)
    ↓
Frontend (renderiza 2 abas)
    ↓
Supabase (persiste se autenticado)
```

---

## 🔑 Integrações Externas

| Integração | Status | Chave | URL |
|-----------|--------|-------|-----|
| Supabase Auth | ✅ Real | NEXT_PUBLIC_SUPABASE_ANON_KEY | https://supabase.com |
| Supabase DB | ✅ Real | SUPABASE_SERVICE_ROLE_KEY | https://supabase.com |
| ReceitaWS | ✅ Real | Nenhuma (pública) | https://receitaws.com.br |
| Cheerio | ✅ Real | Nenhuma (lib) | npm: cheerio |
| OpenAI | ⚠️ Opcional | OPENAI_API_KEY | https://openai.com |

---

## ⚙️ Variáveis de Ambiente

**Obrigatórias (Supabase):**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

**Opcionais (OpenAI):**
```
OPENAI_API_KEY
```

**Derivadas:**
```
NEXT_PUBLIC_APP_URL (para requests internas)
NODE_ENV (development/production)
```

---

## 🎯 17 Critérios de Aceite

- ✅ 1. Abrir ANAIA
- ✅ 2. Fazer login
- ✅ 3. Clicar "Novo diagnóstico"
- ✅ 4. Informar CNPJ
- ✅ 5. Informar website
- ✅ 6. Iniciar análise
- ✅ 7. Ver processamento
- ✅ 8. Receber resultado
- ✅ 9. Visualizar ABVS
- ✅ 10. Visualizar AI Visibility
- ✅ 11. Visualizar Financial Strength
- ✅ 12. Visualizar concorrentes
- ✅ 13. Visualizar AI–Business Gap
- ✅ 14. Visualizar Action Plan
- ✅ 15. Visualizar Confidence
- ✅ 16. Visualizar Data Coverage
- ✅ 17. Abrir novamente diagnóstico

---

## 🚀 Próximos Passos (Não Implementados)

1. Integração Receita Federal (Financial Data real)
2. Gemini + Claude APIs (além OpenAI)
3. Competitors Discovery automática
4. Domain Authority real (Ahrefs/SEMrush)
5. Monitoramento histórico (ABVS trends)
6. Export PDF/XLSX
7. API pública
8. Planos pagos
9. Webhooks
10. Dashboard multi-empresa

---

## 📞 Suporte

**Erro:** `CNPJ não encontrado`
→ ReceitaWS rate limit (30/min). Aguardar 30s.

**Erro:** `OpenAI não configurado`
→ Normal. Copiar OPENAI_API_KEY do QuickStart se quiser testar.

**Erro:** `Supabase não configurado`
→ Verificar .env.local com valores corretos de URL e chaves.

**Erro:** `Website não responde`
→ Alguns sites bloqueiam crawlers. Usar outro.

---

## ✅ Checklist Final

- [ ] `npm create-next-app` ✓
- [ ] Copiar arquivos conforme PROJECT_STRUCTURE.txt ✓
- [ ] `npm install` dependencies ✓
- [ ] Supabase project criado ✓
- [ ] SQL executado no Supabase ✓
- [ ] `.env.local` com valores corretos ✓
- [ ] `npm run dev` ✓
- [ ] Testar login + diagnóstico ✓
- [ ] Ver resultado com ABVS ✓

---

**Desenvolvido:** 20/08/2026
**Status:** Production-Ready
**Suporte:** QUICK_START.md → INSTALLATION.md → SUMMARY.md
