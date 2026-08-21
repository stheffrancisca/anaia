# ANAIA v1.0 — Data Sources Audit & Availability Map

**Data**: 20/08/2026  
**Status**: Definição Estrutural Fechada  
**Objetivo**: Mapear exatamente quais variáveis conseguimos obter de forma reproduzível antes de arquitetar o ABVS

---

## 🏆 Princípio de Ouro
> "Every score must be traceable to a source, methodology and observation date"  
> Todo score precisa ser rastreável à sua fonte, metodologia e data de observação.

Isso diferencia o ANAIA de um dashboard que inventa notas.

---

## I. DADOS CADASTRAIS (Tier 1 — Alta Confiabilidade)

### Variável: CNPJ Status

| Atributo | Valor |
|----------|-------|
| **Fonte** | Base Aberta CNPJ (gov.br) + Receita Federal |
| **Cobertura** | 100% das empresas ativas + encerradas |
| **Atualização** | Diária (Receita Federal) |
| **Confiabilidade** | Alta (fonte oficial) |
| **MVP** | ✅ Sim |
| **Tratamento Ausência** | N/A (todos têm CNPJ) |

**Dados Coletáveis**:
- CNPJ válido
- Situação cadastral (Ativa/Suspensa/Cancelada)
- Data abertura
- Data última alteração
- Porte empresa (Microempresa/Pequena/Média/Grande)

**Esforço Técnico**: Baixo (API disponível, webhook possível)

---

### Variável: Classificação CNAE

| Atributo | Valor |
|----------|-------|
| **Fonte** | Base Aberta CNPJ |
| **Cobertura** | 100% |
| **Atualização** | Conforme alterações cadastrais |
| **Confiabilidade** | Alta |
| **MVP** | ✅ Sim |
| **Tratamento Ausência** | CNAE sem especificação (usar genérica) |

**Dados Coletáveis**:
- CNAE primária
- CNAE secundária (múltiplas)
- Descrição atividade

**Usar Para**: Identificar segmento, buscar concorrentes, contextualizar

---

### Variável: Capital Social

| Atributo | Valor |
|----------|-------|
| **Fonte** | Base Aberta CNPJ |
| **Cobertura** | ~85% (nem todos têm preenchido) |
| **Atualização** | Conforme alterações |
| **Confiabilidade** | Moderada (preenchimento inconsistente) |
| **MVP** | ✅ Sim (como sinal, não como métrica absoluta) |
| **Tratamento Ausência** | "Not available" → Confidence ↓ |

**Dados Coletáveis**:
- Capital social declarado
- Data atualização

**Insight**: Capital baixo/zero não significa empresa fraca. Muitas startups.

---

### Variável: Estrutura Estabelecimentos

| Atributo | Valor |
|----------|-------|
| **Fonte** | Base Aberta CNPJ |
| **Cobertura** | 100% |
| **Atualização** | Conforme abertura/encerramento |
| **Confiabilidade** | Alta |
| **MVP** | ✅ Sim (indica escala geográfica) |
| **Tratamento Ausência** | N/A (todas têm ≥1) |

**Dados Coletáveis**:
- Número de estabelecimentos
- Estados onde presente
- Classificação matriz/filial

**Insight**: Empresa com 50 filiais ≠ empresa com 1. Sinal de escala.

---

## II. DADOS FINANCEIROS (Tier 2 + Tier 3)

### Variável: Receita Bruta Anual

| Atributo | Valor |
|----------|-------|
| **Fonte** | Tier 2: Receita Federal (DAS/DEFIS) + Tier 3: Empresa informa |
| **Cobertura** | ~40% (dados públicos) + cliente (100% se informar) |
| **Atualização** | Anual (dados públicos) / conforme empresa (cliente) |
| **Confiabilidade** | Alta (públicos) / Moderada (cliente) |
| **MVP** | ✅ Sim |
| **Tratamento Ausência** | "Revenue: Not available" → Confidence ↓↓ |

**Tier 2 - Dados Públicos (Receita Federal)**:
- Simples Nacional: arrecadação de DAS
- MEI: arrecadação de contribuição
- Lucro Presumido/Real: apenas companhias abertas

**Tier 3 - Dados Cliente**:
- Empresa auto-reporta no dashboard
- Recebe certificado/selo de "dados verificados"
- Permite atualização trimestral

**Decisão Crítica**: Jamais inventar receita. Se não tem, fica "Not available".

---

### Variável: Margem Operacional

| Atributo | Valor |
|----------|-------|
| **Fonte** | Tier 3: Empresa informa (EBITDA/Revenue) |
| **Cobertura** | Somente se empresa fornece (MVP ~0%) |
| **Atualização** | Conforme atualização empresa |
| **Confiabilidade** | Moderada (auto-reportado) |
| **MVP** | ✅ Sim (quando disponível) |
| **Tratamento Ausência** | "Margin: Not available" → Confidence ↓ |

**Dados Coletáveis**:
- EBITDA (ou estimativa)
- Margem operacional (%)
- Margem bruta (%)

**Nota**: Praticamente impossível obter dados públicos (nem Receita Federal expõe). Dependente de cliente ou scrape de relatórios públicos corporativos.

---

### Variável: Endividamento (Debt/EBITDA)

| Atributo | Valor |
|----------|-------|
| **Fonte** | Tier 3: Empresa informa |
| **Cobertura** | Somente cliente informa (~0% MVP) |
| **Atualização** | Conforme cliente atualizar |
| **Confiabilidade** | Moderada (auto-reportado) |
| **MVP** | ✅ Sim (quando disponível) |
| **Tratamento Ausência** | "Leverage: Not available" |

**Dados Coletáveis**:
- Dívida total
- EBITDA
- Ratio calculado automaticamente

---

### Variável: Crescimento YoY

| Atributo | Valor |
|----------|-------|
| **Fonte** | Tier 3: Empresa informa (comparação períodos) |
| **Cobertura** | Cliente self-report (~0% MVP) |
| **Atualização** | Anual/trimestral |
| **Confiabilidade** | Moderada |
| **MVP** | ✅ Sim |
| **Tratamento Ausência** | "Growth: Not available" |

**Dados Coletáveis**:
- Receita período anterior
- Crescimento % calculado

---

## III. DADOS DE AUTORIDADE DIGITAL

### Variável: Domain Authority / Backlinks

| Atributo | Valor |
|----------|-------|
| **Fonte** | Ahrefs API / SEMrush API / Open Link Profiler |
| **Cobertura** | ~95% (domínios com presença web) |
| **Atualização** | Semanal (APIs pagas) |
| **Confiabilidade** | Moderada-Alta |
| **MVP** | ✅ Sim |
| **Tratamento Ausência** | "Domain Authority: Not available" (site não existe) |
| **Custo** | $$ (APIs pagas) |

**Dados Coletáveis**:
- Domain Authority score
- Backlinks count
- Referring domains
- Organic traffic estimate (Semrush)

**Decisão**: Usar Ahrefs ou SEMrush? Custo MVP? Começar com scrape gratuito de Moz Open Directory?

---

### Variável: Menções Online / Brand Signals

| Atributo | Valor |
|----------|-------|
| **Fonte** | Google Search + APIs (Brand24, Mention) |
| **Cobertura** | ~90% (com site) |
| **Atualização** | Semanal/Diária |
| **Confiabilidade** | Moderada (sinais indiretos) |
| **MVP** | ✅ Sim |
| **Tratamento Ausência** | "Mentions: 0" (aceitável se não há presença) |

**Dados Coletáveis**:
- Menções em artigos/blogs
- Reviews agregadas
- Social mentions

---

## IV. AI VISIBILITY (o Diferencial)

### Estrutura: 30 Prompts × 3 Modelos = 90 Inferências/Ciclo

| Atributo | Valor |
|----------|-------|
| **Modelos** | ChatGPT (gpt-4o ou gpt-4-turbo) + Gemini (1.5 Pro) + Claude (3.5 Sonnet) |
| **Prompts por Modelo** | 30 |
| **Total Inferências** | 90 por empresa/ciclo |
| **Frequência** | Mensal (MVP) |
| **Cobertura** | ~100% (qualquer empresa mencionável) |
| **Confiabilidade** | Moderada (variância modelo-a-modelo) |
| **MVP** | ✅ Sim |
| **Tratamento Variância** | Medir consistência, não ignorar |

---

### Composição de Prompts: 30 Estruturados

#### Categoria A: "Quais são as melhores empresas de X?" (10 prompts)

```
Variável: Category Excellence Queries
Exemplo:
- "Quais são as melhores empresas de software de FP&A no Brasil?"
- "Quais empresas você recomendaria para software de gestão financeira?"
- "Top 5 softwares de análise financeira brasileiros"
```

**Objetivo**: Medir presença em recomendações de categoria

---

#### Categoria B: "Intenção Comercial" (10 prompts)

```
Variável: Commercial Intent Queries
Exemplo:
- "Qual software de FP&A você recomendaria para uma PME?"
- "Qual é melhor: software X vs software Y para startups?"
- "Preciso de uma ferramenta de análise financeira, qual você recomenda?"
```

**Objetivo**: Medir recomendação em contextos de decisão de compra

---

#### Categoria C: "Comparações Diretas" (5 prompts)

```
Variável: Competitive Comparison Queries
Exemplo:
- "Empresa A vs Empresa B: qual melhor para análise financeira?"
- "Compare as soluções de Empresa X e Empresa Y"
```

**Objetivo**: Medir posicionamento relativo vs concorrentes

---

#### Categoria D: "Autoridade / Referência" (5 prompts)

```
Variável: Authority Queries
Exemplo:
- "Quais são as empresas de referência em FP&A no Brasil?"
- "Qual empresa é considerada especialista em análise financeira?"
```

**Objetivo**: Medir percepção de expertise/liderança

---

### Dimensões Medidas em Cada Resposta

Para cada prompt × modelo, medir:

#### Dimensão: Presence (0-100)

```
A empresa apareceu na resposta?
- Sim, explicitamente: 100
- Sim, mencionada: 80
- Sim, contexto relacionado: 60
- Não, mas concorrente sim: 20
- Não aparece: 0
```

---

#### Dimensão: Recommendation (0-100)

```
Foi efetivamente recomendada?
- "Recomendo A" (explícito): 100
- "A é boa para X" (qualificado): 80
- "A é uma opção" (neutra): 60
- "Mencionada sem recomendação": 30
- Não recomendada: 0
```

---

#### Dimensão: Position (0-100)

```
Posição na resposta:
- Posição 1-2: 100
- Posição 3-5: 85
- Posição 6-10: 70
- Posição 11+: 50
- Mencionada não em lista: 40
```

---

#### Dimensão: Relevance (0-1 score)

```
Menção estava no contexto correto?
- Contexto exato de negócio: 0.95-1.0
- Contexto similar: 0.75-0.94
- Contexto tangencial: 0.50-0.74
- Contexto distante: 0.20-0.49
- Irrelevante: 0.0-0.19
```

---

#### Dimensão: Competitive Share (0-100)

```
Quanto da atenção foi destinado à empresa vs concorrentes?
- Única menção: 100
- 50% das menções: 50
- 25% das menções: 25
- < 10% das menções: 10
```

---

#### Dimensão: Consistency (0-100)

```
Resultado se repete em múltiplas execuções?
- Aparece em 90%+ execuções: 95
- Aparece em 70-89% execuções: 80
- Aparece em 50-69% execuções: 60
- Aparece em 25-49% execuções: 40
- Aparece < 25% execuções: 20
```

---

### Agregação: AI Visibility Score

```
AI Visibility = 
  (Presence × 0.25) +
  (Recommendation × 0.25) +
  (Position × 0.20) +
  (Relevance × 100 × 0.15) +
  (Competitive Share × 0.10) +
  (Consistency × 0.05)

Resultado: 0-100
Base: 90 avaliações (30 prompts × 3 modelos)
```

---

### Formato de Output

```json
{
  "company_name": "Empresa X",
  "measurement_date": "2026-08-20",
  "ai_visibility_score": 72,
  "base_evaluations": 90,
  "consistency": 0.74,
  "dimensions": {
    "presence": 82,
    "recommendation": 71,
    "position": 68,
    "relevance": 0.94,
    "competitive_share": 54,
    "consistency": 74
  },
  "by_model": {
    "chatgpt": { "score": 75, "evaluations": 30 },
    "gemini": { "score": 71, "evaluations": 30 },
    "claude": { "score": 70, "evaluations": 30 }
  },
  "confidence": 0.86,
  "note": "Resultado representa observação de 90 inferências diferentes. Variância entre modelos: 5 pontos."
}
```

---

## V. COMPETIDOR INTELLIGENCE

### Estratégia: Discovery Automático + Validação Humana

| Atributo | Valor |
|----------|-------|
| **Método** | IA identifica + usuário valida |
| **Cobertura** | 100% (sempre há competidores) |
| **Confiabilidade** | Moderada-Alta (após validação) |
| **MVP** | ✅ Sim |
| **Frequência Atualização** | Conforme análise |

---

### Fluxo

```
ENTRADA: CNPJ + site + segmento
  ↓
MOTOR DE IA:
  - Analisa CNAE
  - Executa buscas: "concorrentes de X no Brasil"
  - Consulta modelos: "empresas similares a X"
  ↓
RESULTADO: 5-7 potenciais concorrentes
  ↓
APRESENTAÇÃO AO USUÁRIO:
  Encontramos estes concorrentes:
  ☐ Empresa A
  ☐ Empresa B
  ☐ Empresa C
  ☐ Empresa D
  ☐ Empresa E
  ↓
VALIDAÇÃO: Usuário marca ✓
  ↓
CONFIANÇA: Score aumenta com validação
```

---

### Dados Coletáveis por Competidor

Para cada competidor validado, coletar:
- CNPJ (buscar)
- Website
- AI Visibility (mesma metodologia)
- Financial Strength (se dados públicos)
- Domain Authority
- Menções online

---

## VI. DADOS DO WEBSITE

### Variável: Website Crawl + Analysis

| Atributo | Valor |
|----------|-------|
| **Fonte** | Crawler próprio + APIs (Semrush, SEMrush) |
| **Cobertura** | ~95% (se empresa tem website) |
| **Atualização** | Mensal |
| **Confiabilidade** | Alta |
| **MVP** | ✅ Sim (basic) |
| **Tratamento Ausência** | "No website" → Confidence ↓ |

**Dados Coletáveis**:
- Título página
- Estrutura conteúdo (H1, H2, etc)
- Backlinks
- Structural data (schema.org)
- Termos chave mencionados
- CTAs encontradas

**Insight**: Website bem estruturado = mais fácil IA indexar/referenciar

---

## VII. MATRIZ DE DISPONIBILIDADE GERAL

| Variável | Tier | Cobertura | Confiabilidade | Esforço MVP | Status MVP |
|----------|------|-----------|-----------------|-------------|-----------|
| CNPJ | 1 | 100% | Alta | Baixo | ✅ |
| CNAE | 1 | 100% | Alta | Baixo | ✅ |
| Capital Social | 1 | 85% | Moderada | Baixo | ✅ |
| Estabelecimentos | 1 | 100% | Alta | Baixo | ✅ |
| Receita Bruta | 2+3 | 40% (pub) + cliente | Alta/Moderada | Médio | ✅ |
| Margem | 3 | 0% (pub) | Moderada | Médio | ✅ (cliente) |
| Endividamento | 3 | 0% (pub) | Moderada | Médio | ✅ (cliente) |
| Crescimento | 3 | 0% (pub) | Moderada | Médio | ✅ (cliente) |
| Domain Authority | Pública | 95% | Moderada-Alta | Médio | ✅ |
| Menções Online | Pública | 90% | Moderada | Médio | ✅ |
| AI Visibility | Propriedade | 100% | Moderada | Alto | ✅ |
| Competidores | Propriedade | 100% | Moderada-Alta | Médio | ✅ |
| Website Data | Pública | 95% | Alta | Médio | ✅ |

---

## VIII. REGRAS DE TRATAMENTO DE DADOS AUSENTES

### Regra 1: Jamais Inventar

```
❌ Receita não disponível → Não colocar 0
✅ Receita não disponível → "Revenue: Not available"
```

---

### Regra 2: Transparência em Coverage

```
Financial Strength: 79
Confidence: 91%
Data Coverage: 91%

Components used: ✓ Receita ✓ Margem ✓ Crescimento
Missing: — Endividamento
```

---

### Regra 3: Confidence Reduz

```
Empresa A (dados completos):
  Financial Strength: 82
  Confidence: 94%

Empresa B (dados parciais):
  Financial Strength: 82
  Confidence: 62%

→ Mesma nota, mas confiabilidade diferente
→ Exibição visual diferente (badge de aviso)
```

---

## IX. ARQUITETURA DE DADOS INICIAL

```
                    COMPANY
                       │
             ┌─────────┴─────────┐
             ↓                   ↓
        PUBLIC DATA          COMPANY DATA
        (CNPJ, Web)          (Financeiro auto-reportado)
             │                   │
             └─────────┬─────────┘
                       ↓
                DATA NORMALIZER
                (validar, limpar, uniformizar)
                       │
             ┌─────────┴──────────┐
             ↓                    ↓
       FINANCIAL ENGINE       GEO ENGINE
             │                    │
             ├─ Receita          ├─ Presence
             ├─ Margem           ├─ Recommendation
             ├─ Crescimento      ├─ Position
             └─ Leverage         ├─ Relevance
                                 ├─ Competitive Share
                ↓                └─ Consistency
         FINANCIAL SIGNAL       AI VISIBILITY
             │                    │
             └─────────┬──────────┘
                       ↓
               COMPETITIVE ENGINE
                (buscar concorrentes)
                       │
                       ↓
                 ABVS ENGINE
                       │
              ┌────────┴────────┐
              ↓                 ↓
            SCORE           CONFIDENCE
           (0-100)          (0-100%)
              │                 │
              └────────┬────────┘
                       ↓
                GAP ANALYSIS
          (Financial vs AI Visibility)
                       ↓
                 ACTION PLAN
            (5 recomendações)
```

---

## X. PRIORIZAÇÃO PARA MVP

### FASE 1 (Semana 1-2)

**Essencial**:
- [ ] Integração CNPJ (base aberta)
- [ ] AI Visibility engine (30 prompts × 3 modelos)
- [ ] Competitive discovery (IA + validação)
- [ ] Website crawl (básico)
- [ ] Dashboard ABVS + Confidence

**Não fazer**:
- ❌ Integração ERP
- ❌ Integração bancária
- ❌ Power BI
- ❌ Previsão financeira
- ❌ Múltiplas empresas (onboarding)

---

### FASE 2 (Semana 3-4)

**Se dados privados funcionar**:
- [ ] Upload de dados financeiros (cliente auto-reporta)
- [ ] Monitoramento histórico
- [ ] Alertas de mudanças

---

## XI. QUESTÕES EM ABERTO (Decisões Futuras)

1. **Custo de APIs**: Quanto orçar para Ahrefs/SEMrush? Começar gratuito?
2. **Modelo de Marketting**: Como achar as 10 primeiras empresas beta?
3. **Frequência de Atualização**: Mensal suficiente ou semanal necessário?
4. **Validação de Dados**: Como validar se receita auto-reportada é honesta?
5. **Conformidade**: LGPD/dados públicos — há restrições?

---

## XII. PRÓXIMO PASSO

Com esse Audit em mãos, os próximos passos são:

1. **Testes de Viabilidade** (1-2 dias):
   - Conseguir dados de Receita Federal automaticamente?
   - APIs de IA funcionam como planejado?
   - Crawler web consegue dados de 100 sites?

2. **Protótipo de Coleta** (2-3 dias):
   - Script que puxa CNPJ + CNAE
   - Executa 30 prompts em ChatGPT
   - Calcula AI Visibility

3. **Validação com 2-3 Empresas** (1 dia):
   - Rodar pipeline completo
   - Checar qualidade dados
   - Entrevista: "essa informação é útil?"

4. **ABVS Architecture** (após validação):
   - Com dados reais em mãos, definir pesos com fundamento
   - Não antes

---

**Status**: ✅ Audit Completo. Pronto para Phase de Prototipagem.
