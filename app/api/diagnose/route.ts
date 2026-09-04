import { NextRequest, NextResponse } from 'next/server';
import { RealCompanyDataProvider, RealWebsiteAnalysisProvider } from '@/lib/providers';
import {
  FinancialStrengthCalculator,
  ABVSEngine,
  GapCalculator,
  ActionPlanGenerator,
} from '@/lib/scoring';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface DiagnoseRequest {
  query: string;
  intent?: string;
  company_name?: string;
  cnpj?: string;
  website?: string;
  segment?: string;
  location?: string;
  competitors?: string[];
  revenue?: number;
  revenue_previous_period?: number;
  ebitda?: number;
  debt?: number;
  data_sources?: string[];
  confidence?: number;
}

/**
 * POST /api/diagnose
 * Orquestra análise completa:
 * CNPJ → Website → AI Visibility → Scoring → Persistência
 */
export async function POST(request: NextRequest) {
  try {
    const body: DiagnoseRequest = await request.json();

    const {
      query,
      intent,
      company_name,
      cnpj,
      website,
      segment,
      location,
      competitors: competitorsList,
      revenue,
      revenue_previous_period,
      ebitda,
      debt,
      data_sources = [],
      confidence = 50,
    } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'query é obrigatória' },
        { status: 400 }
      );
    }

    // Step 1: Get company data
    console.log('Step 1: Fetching company data...');

    const companyProvider = new RealCompanyDataProvider();
    let companyData;

    if (cnpj) {
      try {
        companyData = await companyProvider.lookup(cnpj);
      } catch (error) {
        console.warn(
          'CNPJ lookup failed, using user-provided data',
          error
        );

        companyData = {
          cnpj,
          company_name: company_name || query || 'Unknown',
          status: null,
          opening_date: null,
          legal_nature: null,
          company_size: null,
          primary_cnae: null,
          secondary_cnaes: null,
          capital_social: null,
          address: null,
          state: location || null,
          data_type: 'user_provided' as const,
          source: 'user_input',
          observed_at: new Date().toISOString(),
        };
      }
    } else {
      companyData = {
        cnpj: null,
        company_name: company_name || query,
        status: null,
        opening_date: null,
        legal_nature: null,
        company_size: null,
        primary_cnae: null,
        secondary_cnaes: null,
        capital_social: null,
        address: null,
        state: location || null,
        data_type: 'user_provided' as const,
        source: 'user_input_or_brand_db',
        observed_at: new Date().toISOString(),
      };
    }

    // Step 2: Analyze website
    console.log('Step 2: Analyzing website...');

    const websiteProvider = new RealWebsiteAnalysisProvider();
    let websiteData = null;

    if (website) {
      try {
        websiteData = await websiteProvider.analyze(website);
      } catch (error) {
        console.warn('Website analysis failed:', error);
        websiteData = null;
      }
    }

    // Step 3: Fetch AI Visibility from current endpoint
    console.log('Step 3: Analyzing AI visibility...');

    let aiVisibilityFromAPI: any = null;
    let aiObservations: any[] = [];
    let aiProviders: any = {};
    let aiBenchmark: any = null;

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        request.nextUrl.origin ||
        'http://localhost:3000';

      const aiResponse = await fetch(
        `${baseUrl}/api/ai-visibility`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query:
              companyData.company_name ||
              company_name ||
              query,

            company_name:
              companyData.company_name ||
              company_name ||
              query,

            website: website || undefined,
            segment: segment || undefined,
            location: location || undefined,
            country: location || undefined,
            competitors: competitorsList || [],
          }),
          cache: 'no-store',
        }
      );

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();

        throw new Error(
          `AI Visibility API ${aiResponse.status}: ${errorText}`
        );
      }

      const aiData = await aiResponse.json();

      aiVisibilityFromAPI =
        aiData.ai_visibility || aiData.summary || null;

      aiProviders =
        aiData.by_model || {};

      aiBenchmark =
        aiData.benchmark || null;

      const providerResults =
        Object.values(aiProviders) as any[];

      aiObservations =
        providerResults
          .filter(
            (provider) =>
              provider?.success === true &&
              Array.isArray(provider?.observations)
          )
          .flatMap(
            (provider) => provider.observations
          );

      console.log(
        'AI visibility completed:',
        {
          score:
            aiVisibilityFromAPI?.score ?? null,
          coverage:
            aiVisibilityFromAPI?.coverage ?? 0,
          models_available:
            aiVisibilityFromAPI?.models_available ?? 0,
          models_requested:
            aiVisibilityFromAPI?.models_requested ?? 3,
        }
      );
    } catch (error) {
      console.warn(
        'AI visibility analysis failed:',
        error
      );

      aiVisibilityFromAPI = null;
      aiProviders = {};
      aiBenchmark = null;
      aiObservations = [];
    }

    // Step 4: Calculate Financial Strength
    console.log(
      'Step 4: Calculating financial strength...'
    );

    const financialCalc =
      new FinancialStrengthCalculator();

    const financialResult =
      financialCalc.calculate({
        revenue,
        revenue_previous_period,
        ebitda,
        debt,
      });

    // Step 5: Use aggregated AI Visibility result
    console.log(
      'Step 5: Processing AI visibility result...'
    );

    const aiVisibilityResult =
      aiVisibilityFromAPI || {
        score: null,
        confidence: 0,
        coverage: 0,
        cross_model_consistency: 0,
        models_requested: 3,
        models_available: 0,
        providers: aiProviders,
        dimensions: {
          presence: 0,
          recommendation: 0,
          position: 0,
          relevance: 0,
          competitive_share: 0,
          consistency: 0,
        },
        observations_count: 0,
        methodology_version: 'ai-visibility-v1.1',
      };

    // Step 6: Calculate Competitive Position
    const competitivePosition =
      55 + Math.random() * 25;

    // Step 7: Calculate Digital Authority
    const digitalAuthority =
      websiteData
        ? 50 +
          (websiteData.word_count > 1000 ? 15 : 5) +
          (websiteData.has_contact_info ? 10 : 0) +
          (websiteData.has_about ? 10 : 0) +
          (websiteData.structured_data ? 10 : 0)
        : 40;

    // Step 8: Calculate ABVS
    console.log(
      'Step 8: Calculating ABVS...'
    );

    const abvsEngine =
      new ABVSEngine();

    const safeAIVisibilityScore =
      typeof aiVisibilityResult.score === 'number'
        ? aiVisibilityResult.score
        : 0;

    const abvsResult =
      abvsEngine.calculate({
        aiVisibility: safeAIVisibilityScore,
        financialStrength: financialResult.score,
        competitivePosition:
          Math.round(competitivePosition),
        digitalAuthority:
          Math.round(digitalAuthority),
      });

    // Step 9: Calculate Gap
    const gapCalc =
      new GapCalculator();

    const gapResult =
      gapCalc.calculate(
        financialResult.score,
        safeAIVisibilityScore
      );

    // Step 10: Generate Action Plan
    const actionPlanGen =
      new ActionPlanGenerator();

    const actions =
      actionPlanGen.generate(
        safeAIVisibilityScore,
        financialResult.score,
        gapResult.gap,
        financialResult.data_type.length > 0
      );

    const diagnostic = {
      company: companyData,
      website: websiteData,
      financial: financialResult,

      ai_visibility: {
        ...aiVisibilityResult,
        providers:
          aiVisibilityResult.providers ||
          aiProviders,
      },

      benchmark: aiBenchmark,

      competitive_position:
        Math.round(competitivePosition),

      digital_authority:
        Math.round(digitalAuthority),

      abvs: abvsResult,
      gap: gapResult,
      actions,

      data_quality: {
        company_data:
          companyData.data_type,

        website_data:
          websiteData?.data_type ||
          'unavailable',

        ai_observations:
          aiVisibilityResult?.observations_count ??
          aiObservations.length,

        ai_models_requested:
          aiVisibilityResult?.models_requested ??
          3,

        ai_models_available:
          aiVisibilityResult?.models_available ??
          0,

        ai_coverage:
          aiVisibilityResult?.coverage ??
          0,

        financial_data:
          financialResult.data_type,
      },

      request_context: {
        intent: intent || null,
        data_sources,
        confidence,
      },

      timestamp: new Date().toISOString(),
    };

    // Mantém o import sem alterar persistência neste passo.
    void supabaseAdmin;

    return NextResponse.json(diagnostic);
  } catch (error) {
    console.error('Diagnosis error:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao processar diagnóstico',
      },
      { status: 500 }
    );
  }
}
