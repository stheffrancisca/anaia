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
  cnpj: string;
  website: string;
  segment: string;
  revenue?: number;
  revenue_previous_period?: number;
  ebitda?: number;
  debt?: number;
}

/**
 * POST /api/diagnose
 * Orquestra análise completa: CNPJ → Website → AI Visibility → Scoring → Persistência
 */
export async function POST(request: NextRequest) {
  try {
    const body: DiagnoseRequest = await request.json();
    const { cnpj, website, segment, revenue, revenue_previous_period, ebitda, debt } = body;

    if (!cnpj || !website || !segment) {
      return NextResponse.json(
        { error: 'cnpj, website e segment são obrigatórios' },
        { status: 400 }
      );
    }

    // Step 1: Get company data
    console.log('Step 1: Fetching company data...');
    const companyProvider = new RealCompanyDataProvider();
    let companyData;
    try {
      companyData = await companyProvider.lookup(cnpj);
    } catch (error) {
      return NextResponse.json(
        {
          error: `Erro ao buscar dados da empresa: ${error instanceof Error ? error.message : 'Unknown error'}`,
          step: 'company_lookup',
        },
        { status: 400 }
      );
    }

    // Step 2: Analyze website
    console.log('Step 2: Analyzing website...');
    const websiteProvider = new RealWebsiteAnalysisProvider();
    let websiteData;
    try {
      websiteData = await websiteProvider.analyze(website);
    } catch (error) {
      console.warn('Website analysis failed:', error);
      websiteData = null;
    }

    // Step 3: Fetch AI observations
    console.log('Step 3: Analyzing AI visibility...');
    let aiObservations = [];
    try {
      const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai-visibility/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: companyData.company_name || cnpj,
          website,
          segment,
          competitors: [],
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
