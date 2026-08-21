// ============================================================================
// QUERY RESOLVER — Classifica entrada e enriquece dados
// ============================================================================

export type QueryIntent = 'brand' | 'company' | 'website' | 'cnpj' | 'category' | 'keyword' | 'commercial_intent' | 'unknown';

export interface QueryIntentResult {
  intent: QueryIntent;
  value: string;
  confidence: number;
}

export interface EnrichedEntity {
  original_query: string;
  intent: QueryIntent;
  company_name: string | null;
  cnpj: string | null;
  website: string | null;
  segment: string | null;
  location: string | null;
  description: string | null;
  confidence: number;
  data_sources: string[];
}

// ============================================================================
// REGEX PATTERNS
// ============================================================================

const CNPJ_REGEX = /(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/g;
const DOMAIN_REGEX = /(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}/gi;
const WEBSITE_REGEX = /^(https?:\/\/)?(www\.)?[a-z0-9-]+\.[a-z]{2,}(\/.*)?$/i;

// ============================================================================
// KNOWN BRANDS DATABASE (MVP — can be extended)
// ============================================================================

const KNOWN_BRANDS: { [key: string]: EnrichedEntity } = {
  nike: {
    original_query: 'Nike',
    intent: 'brand',
    company_name: 'Nike Inc.',
    cnpj: null, // US company
    website: 'nike.com',
    segment: 'varejo / e-commerce',
    location: 'United States',
    description: 'Fabricante de calçados e vestuário esportivo',
    confidence: 95,
    data_sources: ['brand_database'],
  },
  nubank: {
    original_query: 'Nubank',
    intent: 'brand',
    company_name: 'Nu Pagamentos S.A.',
    cnpj: '23.197.585/0001-36',
    website: 'nubank.com.br',
    segment: 'fintech / banco digital',
    location: 'Brasil',
    description: 'Banco digital focado em pessoas físicas e PMEs',
    confidence: 98,
    data_sources: ['brand_database'],
  },
  apple: {
    original_query: 'Apple',
    intent: 'brand',
    company_name: 'Apple Inc.',
    cnpj: null,
    website: 'apple.com',
    segment: 'tecnologia / eletrônicos',
    location: 'United States',
    description: 'Fabricante de produtos eletrônicos (iPhones, Macs, etc)',
    confidence: 95,
    data_sources: ['brand_database'],
  },
  google: {
    original_query: 'Google',
    intent: 'brand',
    company_name: 'Alphabet Inc.',
    cnpj: null,
    website: 'google.com',
    segment: 'tecnologia / software',
    location: 'United States',
    description: 'Motor de busca e plataforma de publicidade',
    confidence: 95,
    data_sources: ['brand_database'],
  },
  microsoft: {
    original_query: 'Microsoft',
    intent: 'brand',
    company_name: 'Microsoft Corporation',
    cnpj: null,
    website: 'microsoft.com',
    segment: 'tecnologia / software',
    location: 'United States',
    description: 'Desenvolvimento de software (Windows, Office, Azure)',
    confidence: 95,
    data_sources: ['brand_database'],
  },
  amazon: {
    original_query: 'Amazon',
    intent: 'brand',
    company_name: 'Amazon.com Inc.',
    cnpj: null,
    website: 'amazon.com',
    segment: 'e-commerce / cloud',
    location: 'United States',
    description: 'Plataforma de e-commerce e serviços em nuvem',
    confidence: 95,
    data_sources: ['brand_database'],
  },
};

// ============================================================================
// CATEGORY KEYWORDS
// ============================================================================

const CATEGORY_KEYWORDS: { [key: string]: string } = {
  // Software/SaaS
  software: 'software',
  saas: 'software',
  app: 'software',
  aplicativo: 'software',
  plataforma: 'software',

  // Finance
  banco: 'financeiro',
  fintech: 'financeiro',
  financeira: 'financeiro',
  investimento: 'financeiro',
  segurador: 'financeiro',

  // E-commerce
  loja: 'e-commerce',
  'e-commerce': 'e-commerce',
  varejo: 'e-commerce',
  marketplace: 'e-commerce',

  // Consultoria
  consultoria: 'consultoria',
  consulting: 'consultoria',
  agência: 'consultoria',
  agency: 'consultoria',

  // B2B Services
  serviço: 'serviços B2B',
  services: 'serviços B2B',
  soluções: 'serviços B2B',

  // Manufatura
  indústria: 'manufatura',
  fábrica: 'manufatura',
  produção: 'manufatura',
};

// ============================================================================
// resolveQueryIntent — Classifica a entrada
// ============================================================================

export function resolveQueryIntent(query: string): QueryIntentResult {
  const trimmed = query.trim();

  // Check CNPJ
  if (CNPJ_REGEX.test(trimmed)) {
    return {
      intent: 'cnpj',
      value: trimmed,
      confidence: 95,
    };
  }

  // Check Website
  if (WEBSITE_REGEX.test(trimmed)) {
    return {
      intent: 'website',
      value: trimmed,
      confidence: 90,
    };
  }

  // Check if domain pattern
  if (DOMAIN_REGEX.test(trimmed)) {
    return {
      intent: 'website',
      value: trimmed,
      confidence: 80,
    };
  }

  // Check for commercial intent patterns
  const commercialPatterns = ['melhor', 'qual', 'recomenda', 'compare', 'vs', 'versus'];
  if (commercialPatterns.some((p) => trimmed.toLowerCase().includes(p))) {
    return {
      intent: 'commercial_intent',
      value: trimmed,
      confidence: 75,
    };
  }

  // Check category keywords
  const lowerQuery = trimmed.toLowerCase();
  for (const [keyword, category] of Object.entries(CATEGORY_KEYWORDS)) {
    if (lowerQuery.includes(keyword)) {
      return {
        intent: 'category',
        value: category,
        confidence: 85,
      };
    }
  }

  // Check if known brand
  if (KNOWN_BRANDS[lowerQuery]) {
    return {
      intent: 'brand',
      value: trimmed,
      confidence: 95,
    };
  }

  // Default: brand or company name
  if (trimmed.length > 2) {
    return {
      intent: 'brand',
      value: trimmed,
      confidence: 50,
    };
  }

  return {
    intent: 'unknown',
    value: trimmed,
    confidence: 0,
  };
}

// ============================================================================
// resolveEntity — Enriquece dados da entidade
// ============================================================================

export async function resolveEntity(query: string): Promise<EnrichedEntity> {
  const intent = resolveQueryIntent(query);
  const trimmed = query.trim();
  const lowerQuery = trimmed.toLowerCase();

  // ❌ NUNCA inventar. Se não encontrar, retorna null.

  // 1. Check known brands
  if (KNOWN_BRANDS[lowerQuery]) {
    return KNOWN_BRANDS[lowerQuery];
  }

  // 2. Check if CNPJ
  if (intent.intent === 'cnpj') {
    return {
      original_query: query,
      intent: 'cnpj',
      company_name: null, // Would need lookup
      cnpj: trimmed,
      website: null,
      segment: null,
      location: null,
      description: null,
      confidence: 70,
      data_sources: ['cnpj_input'],
    };
  }

  // 3. Check if website
  if (intent.intent === 'website') {
    const cleanUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    return {
      original_query: query,
      intent: 'website',
      company_name: null, // Would need crawl
      cnpj: null,
      website: cleanUrl,
      segment: null,
      location: null,
      description: null,
      confidence: 60,
      data_sources: ['website_input'],
    };
  }

  // 4. Check if category
  if (intent.intent === 'category') {
    return {
      original_query: query,
      intent: 'category',
      company_name: null,
      cnpj: null,
      website: null,
      segment: intent.value, // The category itself
      location: null,
      description: `Análise de empresas no segmento: ${intent.value}`,
      confidence: 75,
      data_sources: ['category_input'],
    };
  }

  // 5. Commercial intent (open query)
  if (intent.intent === 'commercial_intent') {
    return {
      original_query: query,
      intent: 'commercial_intent',
      company_name: null,
      cnpj: null,
      website: null,
      segment: null,
      location: null,
      description: trimmed,
      confidence: 50,
      data_sources: ['commercial_intent_input'],
    };
  }

  // 6. Generic brand/company (low confidence)
  return {
    original_query: query,
    intent: 'brand',
    company_name: trimmed, // Just the user input
    cnpj: null,
    website: null,
    segment: null,
    location: null,
    description: null,
    confidence: 40,
    data_sources: ['user_input'],
  };
}

// ============================================================================
// buildDiagnosisPayload — Constrói payload para API baseado na entidade
// ============================================================================

export async function buildDiagnosisPayload(entity: EnrichedEntity, additionalContext?: any) {
  return {
    query: entity.original_query,
    intent: entity.intent,
    company_name: entity.company_name || additionalContext?.company_name,
    cnpj: entity.cnpj || additionalContext?.cnpj,
    website: entity.website || additionalContext?.website,
    segment: entity.segment || additionalContext?.segment,
    location: entity.location || additionalContext?.location,
    competitors: additionalContext?.competitors || [],
    revenue: additionalContext?.revenue,
    ebitda: additionalContext?.ebitda,
    debt: additionalContext?.debt,
    data_sources: entity.data_sources,
    confidence: entity.confidence,
  };
}
