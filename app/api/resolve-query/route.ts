import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * POST /api/resolve-query
 * Input: { query: string }
 * Returns: Entidade enriquecida com dados obtidos
 */
export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query muito curta' }, { status: 400 });
    }

    // Inline resolve logic (não importar para não precisar de transpilação)
    const trimmed = query.trim().toLowerCase();

    // Known brands database
    const knownBrands: { [key: string]: any } = {
      nike: {
        original_query: 'Nike',
        intent: 'brand',
        company_name: 'Nike Inc.',
        cnpj: null,
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
        description: 'Fabricante de produtos eletrônicos',
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
        description: 'Desenvolvimento de software',
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

    // Check if known brand
    if (knownBrands[trimmed]) {
      return NextResponse.json(knownBrands[trimmed]);
    }

    // Check CNPJ
    const cnpjRegex = /(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/;
    if (cnpjRegex.test(trimmed)) {
      return NextResponse.json({
        original_query: query,
        intent: 'cnpj',
        company_name: null,
        cnpj: trimmed,
        website: null,
        segment: null,
        location: null,
        description: null,
        confidence: 80,
        data_sources: ['cnpj_input'],
      });
    }

    // Check Website
    const websiteRegex = /^(https?:\/\/)?(www\.)?[a-z0-9-]+\.[a-z]{2,}(\/.*)?$/i;
    if (websiteRegex.test(trimmed)) {
      const cleanUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
      return NextResponse.json({
        original_query: query,
        intent: 'website',
        company_name: null,
        cnpj: null,
        website: cleanUrl,
        segment: null,
        location: null,
        description: null,
        confidence: 75,
        data_sources: ['website_input'],
      });
    }

    // Check Category Keywords
    const categoryKeywords: { [key: string]: string } = {
      software: 'software',
      saas: 'software',
      app: 'software',
      banco: 'financeiro',
      fintech: 'financeiro',
      loja: 'e-commerce',
      'e-commerce': 'e-commerce',
      consultoria: 'consultoria',
      serviço: 'serviços B2B',
      indústria: 'manufatura',
    };

    for (const [keyword, category] of Object.entries(categoryKeywords)) {
      if (trimmed.includes(keyword)) {
        return NextResponse.json({
          original_query: query,
          intent: 'category',
          company_name: null,
          cnpj: null,
          website: null,
          segment: category,
          location: null,
          description: `Análise no segmento: ${category}`,
          confidence: 80,
          data_sources: ['category_input'],
        });
      }
    }

    // Check commercial intent
    const commercialPatterns = ['melhor', 'qual', 'recomenda', 'compare', 'vs'];
    if (commercialPatterns.some((p) => trimmed.includes(p))) {
      return NextResponse.json({
        original_query: query,
        intent: 'commercial_intent',
        company_name: null,
        cnpj: null,
        website: null,
        segment: null,
        location: null,
        description: trimmed,
        confidence: 60,
        data_sources: ['commercial_intent_input'],
      });
    }

    // Default: brand/company name (low confidence, mas processa)
    return NextResponse.json({
      original_query: query,
      intent: 'brand',
      company_name: query,
      cnpj: null,
      website: null,
      segment: null,
      location: null,
      description: null,
      confidence: 50,
      data_sources: ['user_input'],
    });
  } catch (error) {
    console.error('Resolve query error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro ao resolver query',
      },
      { status: 500 }
    );
  }
}
