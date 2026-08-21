# ANAIA v1.0 MVP — Setup Rápido

## O Que Funciona Agora

✅ Login / Signup (mock authentication)
✅ Dashboard com CTA "Novo Diagnóstico"
✅ Formulário CNPJ + Site + Segmento
✅ Processamento/Loading com progresso
✅ Resultado com 7 seções completas:
  - ABVS (AI Business Viability Score)
  - Visibilidade IA (6 dimensões)
  - Força Financeira
  - Posição Competitiva
  - Gap IA-Financeiro
  - Plano de Ação (5 itens)
  - Confiabilidade + Cobertura de Dados
✅ Detalhamento por abas
✅ Histórico de diagnósticos (estrutura pronta)
✅ Dark mode glassmorphism
✅ Português 100%
✅ Responsivo

## Como Colocar Funcionando

### Opção 1: React + Vite (Mais Rápido)

```bash
npm create vite@latest anaia-mvp -- --template react
cd anaia-mvp
npm install

# Copiar conteúdo de anaia-v1.0-mvp.jsx para src/App.jsx
# (remove import de React se erro, React 18+ não precisa)

npm run dev
# Acessa em http://localhost:5173
```

### Opção 2: Create React App

```bash
npx create-react-app anaia-mvp
cd anaia-mvp

# Copiar conteúdo de anaia-v1.0-mvp.jsx para src/App.js
# (manter .jsx ou renomear para .js)

npm start
# Acessa em http://localhost:3000
```

### Opção 3: Next.js (Recomendado para Produção)

```bash
npx create-next-app@latest anaia-mvp --typescript
cd anaia-mvp

# Copiar conteúdo para app/page.tsx
# Ou criar arquivo app/components/ANAIAApp.jsx e importar

npm run dev
# Acessa em http://localhost:3000
```

## Credenciais de Teste

**E-mail:** qualquer@email.com
**Senha:** qualquer (mínimo 6 caracteres)

## Arquitetura de Providers

Código atual usa:

- `MockAIProvider` — Simula análise de visibilidade em IA
- `MockFinancialProvider` — Simula dados financeiros
- `MockCompetitiveProvider` — Simula descoberta de concorrentes

Para integrar APIs reais (depois):

1. Criar `RealAIProvider` com chamadas a OpenAI/Gemini/Claude
2. Criar `RealFinancialProvider` com Receita Federal
3. Criar `RealCompetitiveProvider` com busca automática

Trocar imports em `ANAIAApp()` sem alterar frontend.

## Fluxo Completo (Testar)

1. Abrir app → Login
2. Qualquer email + senha → Entra
3. Clique "Começar Análise"
4. Preencher:
   - CNPJ: 00.000.000/0000-00 (qualquer formato válido)
   - Website: https://www.empresa.com.br
   - Segmento: (escolher qualquer)
5. Clique "Analisar Empresa"
6. Ver processamento (fake progress)
7. Ver resultado com ABVS + todas as 7 seções
8. Clicar em "Visão Geral" / "Detalhado" para ver abas
9. Clicar "Novo Diagnóstico" → volta ao dashboard

## Próximos Passos

### Curto Prazo (Hoje)
- [ ] Rodar o app localmente
- [ ] Testar fluxo completo
- [ ] Confirmar que 17 critérios de aceite funcionam

### Médio Prazo (Esta Semana)
- [ ] Integrar Supabase real (auth + banco)
- [ ] Substituir MockAIProvider por OpenAI API
- [ ] Criar RLS policies no Supabase

### Longo Prazo
- [ ] Integrar Receita Federal
- [ ] APIs Gemini + Claude
- [ ] Competidor discovery real
- [ ] Deployment (Vercel)

## Estrutura de Pastas (Se Usar Vite/Next)

```
anaia-mvp/
├── src/
│   ├── App.jsx (anaia-v1.0-mvp.jsx)
│   └── index.css (opcional, styles já inline)
├── package.json
└── vite.config.js (se Vite)
```

## Variáveis de Ambiente (Para Depois)

Criar `.env.local`:

```
REACT_APP_SUPABASE_URL=https://xxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=xxx
REACT_APP_OPENAI_API_KEY=sk-xxx
```

Neste MVP não são necessárias (tudo mock).

## Erros Comuns

**"React não é definido"**
→ React 18+ não precisa de `import React`. Remover linha se erro.

**"export default" não funciona**
→ Se usar CommonJS, trocar para `module.exports = ANAIAApp`.

**Styles não carregam**
→ Styles estão inline em JavaScript. Funciona em qualquer ambiente.

---

**Status:** ✅ MVP pronto. Bora rodar!
