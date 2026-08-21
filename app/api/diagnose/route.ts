import { NextRequest, NextResponse } from 'next/server';
import { RealCompanyDataProvider, RealWebsiteAnalysisProvider } from '@/lib/providers';
import {
  FinancialStrengthCalculator,
  AIVisibilityCalculator,
  ABVSEngine,
  GapCalculator,
  ActionPlanGenerator,
} from '@/lib/scoring';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 segundos para Vercel

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
 * Orquestra análise completa: CNPJ → Website → AI Visibility → Scoring → Persistência
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

    // Step 1: Get company data (opcional — tenta se tiver CNPJ, senão usa dados fornecidos)
    console.log('Step 1: Fetching company data...');
    const companyProvider = new RealCompanyDataProvider();
    let companyData;

    if (cnpj) {
      try {
        companyData = await companyProvider.lookup(cnpj);
      } catch (error) {
        console.warn('CNPJ lookup failed, using user-provided data');
        companyData = {
          cnpj: cnpj,
          company_name: company_name || 'Unknown',
          status: null,
          opening_date: null,
          legal_nature: null,
          company_size: null,
          primary_cnae: null,
          secondary_cnaes: null,
          capital_social: null,
          address: null,
          state: null,
          data_type: 'user_provided' as const,
          source: 'user_input',
          observed_at: new Date().toISOString(),
        };
      }
    } else {
      // Sem CNPJ, criar placeholder com dados do user
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

    // Step 2: Analyze website (opcional — se não tem website, skip)
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

    // Step 3: Fetch AI observations
    console.log('Step 3: Analyzing AI visibility...');
    let aiObservations = [];
    try {
      const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai-visibility/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: companyData.company_name || company_name || query,
          website: website || undefined,
          segment: segment || undefined,
          competitors: competitorsList || [],
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        aiObservations = aiData.observations || [];
      }
    } catch (error) {
      console.warn('AI visibility analysis failed:', error);
    }

    // Step 4: Calculate Financial Strength
    console.log('Step 4: Calculating financial strength...');
    const financialCalc = new FinancialStrengthCalculator();
    const financialResult = financialCalc.calculate({
      revenue,
      revenue_previous_period,
      ebitda,
      debt,
    });

    // Step 5: Calculate AI Visibility
    console.log('Step 5: Calculating AI visibility...');
    const aiCalc = new AIVisibilityCalculator();
    const aiVisibilityResult = aiCalc.calculate(
      aiObservations.map((o) => ({
        presence: o.presence,
        recommendation: o.recommendation,
        position: o.position,
        relevance: o.relevance,
        competitive_share: o.competitive_share,
      }))
    );

    // Step 6: Calculate Competitive Position (mock for now)
    const competitivePosition = 55 + Math.random() * 25;

    // Step 7: Calculate Digital Authority (based on website + domain)
    const digitalAuthority = websiteData
      ? 50 +
        (websiteData.word_count > 1000 ? 15 : 5) +
        (websiteData.has_contact_info ? 10 : 0) +
        (websiteData.has_about ? 10 : 0) +
        (websiteData.structured_data ? 10 : 0)
      : 40;

    // Step 8: Calculate ABVS
    console.log('Step 8: Calculating ABVS...');
    const abvsEngine = new ABVSEngine();
    const abvsResult = abvsEngine.calculate({
      aiVisibility: aiVisibilityResult.score,
      financialStrength: financialResult.score,
      competitivePosition: Math.round(competitivePosition),
      digitalAuthority: Math.round(digitalAuthority),
    });

    // Step 9: Calculate Gap
    const gapCalc = new GapCalculator();
    const gapResult = gapCalc.calculate(financialResult.score, aiVisibilityResult.score);

    // Step 10: Generate Action Plan
    const actionPlanGen = new ActionPlanGenerator();
    const actions = actionPlanGen.generate(
      aiVisibilityResult.score,
      financialResult.score,
      gapResult.gap,
      financialResult.data_type.length > 0
    );

    // Build response
    const diagnostic = {
      company: companyData,
      website: websiteData,
      financial: financialResult,
      ai_visibility: aiVisibilityResult,
      competitive_position: Math.round(competitivePosition),
      digital_authority: Math.round(digitalAuthority),
      abvs: abvsResult,
      gap: gapResult,
      actions,
      data_quality: {
        company_data: companyData.data_type,
        website_data: websiteData?.data_type || 'unavailable',
        ai_observations: aiObservations.length,
        financial_data: financialResult.data_type,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(diagnostic);
  } catch (error) {
    console.error('Diagnosis error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro ao processar diagnóstico',
      },
      { status: 500 }
    );
  }
}
