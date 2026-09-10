import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  RealCompanyDataProvider,
  RealWebsiteAnalysisProvider,
} from '@/lib/providers';
import {
  FinancialStrengthCalculator,
  ABVSEngine,
  GapCalculator,
  ActionPlanGenerator,
} from '@/lib/scoring';

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

type PersistenceResult = {
  saved: boolean;
  diagnostic_id: string | null;
  providers_saved?: number;
  competitors_saved?: number;
  observations_saved?: number;
  error?: string;
};

function finiteNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : null;
}

function errorCodeFromMessage(message: unknown): string | null {
  const text = String(message || '');

  if (text.includes('FORA_DO_AR_001')) return '001';
  if (text.includes('FORA_DO_AR_002')) return '002';

  return null;
}


function collectObservationRows(
  diagnosticId: string,
  providerSource: Record<string, any>
) {
  const allowedProviders = [
    'openai',
    'anthropic',
    'gemini',
  ];

  return Object.entries(providerSource || {}).flatMap(
    ([providerName, rawProvider]) => {
      if (!allowedProviders.includes(providerName)) {
        return [];
      }

      const provider = rawProvider as any;

      if (
        !provider?.success ||
        !Array.isArray(provider.observations)
      ) {
        return [];
      }

      return provider.observations
        .filter(
          (observation: any) =>
            observation &&
            typeof observation.prompt === 'string' &&
            observation.prompt.trim()
        )
        .map((observation: any) => ({
          diagnostic_id: diagnosticId,
          provider: providerName,
          model:
            observation.model ||
            provider.model ||
            null,
          prompt: String(observation.prompt),
          response:
            typeof observation.response === 'string'
              ? observation.response
              : null,

          // Não classificamos artificialmente nesta etapa.
          prompt_category: null,
          topic: null,

          presence:
            finiteNumberOrNull(observation.presence),
          recommendation:
            finiteNumberOrNull(
              observation.recommendation
            ),
          position:
            finiteNumberOrNull(observation.position),
          relevance:
            finiteNumberOrNull(observation.relevance),
          competitive_share:
            finiteNumberOrNull(
              observation.competitive_share
            ),
          consistency:
            finiteNumberOrNull(
              observation.consistency
            ),
        }));
    }
  );
}

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

async function persistDiagnostic(params: {
  diagnostic: any;
  body: DiagnoseRequest;
  aiProviders: any;
  aiBenchmark: any;
}): Promise<PersistenceResult> {
  const {
    diagnostic,
    body,
    aiProviders,
    aiBenchmark,
  } = params;

  const supabase =
    getSupabaseAdminClient();

  if (!supabase) {
    return {
      saved: false,
      diagnostic_id: null,
      error:
        'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurada.',
    };
  }

  try {
    const ai =
      diagnostic.ai_visibility || {};

    const dimensions =
      ai.dimensions || {};

    const companyName =
      diagnostic.company?.company_name ||
      body.company_name ||
      body.query;

    const {
      data: insertedDiagnostic,
      error: diagnosticError,
    } = await supabase
      .from('diagnostics')
      .insert({
        /*
          user_id permanece null nesta etapa.
          Não aceitamos user_id vindo do browser para evitar associação
          fraudulenta. Na próxima etapa podemos vinculá-lo à sessão
          HTTP-only do ANAIA pelo backend.
        */
        user_id: null,

        company_name: companyName,
        query: body.query || null,
        segment: body.segment || null,
        location: body.location || null,
        website: body.website || null,
        cnpj:
          diagnostic.company?.cnpj ||
          body.cnpj ||
          null,

        ai_visibility_score:
          finiteNumberOrNull(ai.score),

        confidence:
          finiteNumberOrNull(ai.confidence),

        coverage:
          finiteNumberOrNull(ai.coverage),

        presence:
          finiteNumberOrNull(
            dimensions.presence
          ),

        recommendation:
          finiteNumberOrNull(
            dimensions.recommendation
          ),

        position:
          finiteNumberOrNull(
            dimensions.position
          ),

        relevance:
          finiteNumberOrNull(
            dimensions.relevance
          ),

        competitive_share:
          finiteNumberOrNull(
            dimensions.competitive_share
          ),

        consistency:
          finiteNumberOrNull(
            dimensions.consistency
          ),

        models_requested:
          typeof ai.models_requested ===
          'number'
            ? ai.models_requested
            : 3,

        models_available:
          typeof ai.models_available ===
          'number'
            ? ai.models_available
            : 0,

        observations_count:
          typeof ai.observations_count ===
          'number'
            ? ai.observations_count
            : 0,

        abvs_score:
          finiteNumberOrNull(
            diagnostic.abvs?.score
          ),

        digital_authority:
          finiteNumberOrNull(
            diagnostic.digital_authority
          ),

        competitive_position:
          finiteNumberOrNull(
            diagnostic.competitive_position
          ),

        methodology_version:
          ai.methodology_version || null,
      })
      .select('id')
      .single();

    if (
      diagnosticError ||
      !insertedDiagnostic?.id
    ) {
      throw new Error(
        diagnosticError?.message ||
          'Não foi possível criar o registro principal do diagnóstico.'
      );
    }

    const diagnosticId =
      insertedDiagnostic.id;

    const providerSource =
      aiProviders &&
      Object.keys(aiProviders).length > 0
        ? aiProviders
        : ai.providers || {};

    const providerRows =
      Object.entries(providerSource)
        .filter(
          ([provider]) =>
            [
              'openai',
              'anthropic',
              'gemini',
            ].includes(provider)
        )
        .map(
          ([provider, value]) => {
            const item = value as any;
            const errorMessage =
              item?.error
                ? String(item.error)
                : null;

            return {
              diagnostic_id:
                diagnosticId,

              provider,

              model:
                item?.model || null,

              score:
                item?.success
                  ? finiteNumberOrNull(
                      item?.score
                    )
                  : null,

              success:
                item?.success === true,

              observations_count:
                typeof item
                  ?.observations_count ===
                'number'
                  ? item.observations_count
                  : 0,

              error_code:
                errorCodeFromMessage(
                  errorMessage
                ),

              error_message:
                errorMessage,
            };
          }
        );

    let providersSaved = 0;

    if (providerRows.length > 0) {
      const {
        error: providerError,
      } = await supabase
        .from(
          'diagnostic_providers'
        )
        .insert(providerRows);

      if (providerError) {
        console.warn(
          '[Persistence] providers failed:',
          providerError.message
        );
      } else {
        providersSaved = providerRows.length;
      }
    }

    // Persistir observações individuais por prompt/modelo.
    const observationRows =
      collectObservationRows(
        diagnosticId,
        providerSource
      );

    let observationsSaved = 0;

    if (observationRows.length > 0) {
      const {
        error: observationsError,
      } = await supabase
        .from(
          'diagnostic_observations'
        )
        .insert(observationRows);

      if (observationsError) {
        console.warn(
          '[Persistence] observations failed:',
          observationsError.message
        );
      } else {
        observationsSaved =
          observationRows.length;

        console.log(
          `[Persistence] ${observationsSaved} observations saved.`
        );
      }
    } else {
      console.warn(
        '[Persistence] no AI observations available to save.'
      );
    }

    const benchmarkCompetitors =
      Array.isArray(
        aiBenchmark?.competitors
      )
        ? aiBenchmark.competitors
        : Array.isArray(
            aiBenchmark?.ranking
          )
        ? aiBenchmark.ranking.filter(
            (entry: any) =>
              entry?.is_primary !== true
          )
        : [];

    const competitorRows =
      benchmarkCompetitors
        .filter(
          (entry: any) =>
            entry?.name
        )
        .map((entry: any) => ({
          diagnostic_id:
            diagnosticId,

          company_name:
            String(entry.name),

          score:
            finiteNumberOrNull(
              entry.score
            ),

          rank:
            typeof entry.rank ===
            'number'
              ? entry.rank
              : null,

          gap_to_leader:
            finiteNumberOrNull(
              entry.gap_to_leader
            ),

          models_available:
            typeof entry
              .models_available ===
            'number'
              ? entry.models_available
              : 0,

          models_requested:
            typeof entry
              .models_requested ===
            'number'
              ? entry.models_requested
              : 3,

          status:
            entry.status || null,
        }));

    let competitorsSaved = 0;

    if (
      competitorRows.length > 0
    ) {
      const {
        error: competitorError,
      } = await supabase
        .from(
          'diagnostic_competitors'
        )
        .insert(competitorRows);

      if (competitorError) {
        console.warn(
          '[Persistence] competitors failed:',
          competitorError.message
        );
      } else {
        competitorsSaved =
          competitorRows.length;
      }
    }

    return {
      saved: true,
      diagnostic_id:
        diagnosticId,
      providers_saved:
        providersSaved,
      competitors_saved:
        competitorsSaved,
      observations_saved:
        observationsSaved,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.warn(
      '[Persistence] diagnostic not saved:',
      message
    );

    return {
      saved: false,
      diagnostic_id: null,
      error: message,
    };
  }
}

/**
 * POST /api/diagnose
 *
 * Fluxo:
 * 0. Resolve a consulta com IA e descobre concorrentes/similares
 * 1. Enriquece dados da entidade
 * 2. Analisa website quando disponível
 * 3. Executa AI Visibility + benchmark com concorrentes descobertos
 * 4. Calcula métricas auxiliares sem números aleatórios
 * 5. Persiste histórico
 */
export async function POST(
  request: NextRequest
) {
  try {
    const body: DiagnoseRequest =
      await request.json();

    const {
      query,
      revenue,
      revenue_previous_period,
      ebitda,
      debt,
      data_sources = [],
      confidence = 50,
    } = body;

    if (!query || !query.trim()) {
      return NextResponse.json(
        {
          error: 'query é obrigatória',
        },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.nextUrl.origin ||
      'http://localhost:3000';

    // STEP 0: resolver entidade + descobrir concorrentes automaticamente
    console.log(
      'Step 0: Resolving entity and discovering competitors...'
    );

    let resolvedQuery: any = {
      original_query: query,
      intent: 'unknown',
      entity_name: query,
      company_name: null,
      product_name: null,
      website: null,
      segment: null,
      location: null,
      description: null,
      competitors: [],
      confidence: 'low',
      data_sources: ['user_input'],
    };

    try {
      const resolveResponse =
        await fetch(
          `${baseUrl}/api/resolve-query`,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              query,
            }),
            cache: 'no-store',
          }
        );

      if (resolveResponse.ok) {
        const resolveData =
          await resolveResponse.json();

        if (resolveData?.success !== false) {
          resolvedQuery = {
            ...resolvedQuery,
            ...resolveData,
          };
        }
      } else {
        console.warn(
          '[Diagnose] resolve-query returned',
          resolveResponse.status
        );
      }
    } catch (resolveError) {
      console.warn(
        '[Diagnose] automatic entity resolution unavailable:',
        resolveError
      );
    }

    const discoveredCompetitors =
      Array.isArray(
        resolvedQuery?.competitors
      )
        ? resolvedQuery.competitors
            .filter(
              (item: any) =>
                item &&
                typeof item.name ===
                  'string' &&
                item.name.trim()
            )
            .slice(0, 3)
        : [];

    const competitorNames =
      discoveredCompetitors.map(
        (item: any) =>
          item.name.trim()
      );

    const resolvedEntityName =
      resolvedQuery?.entity_name ||
      resolvedQuery?.company_name ||
      resolvedQuery?.product_name ||
      query;

    const resolvedCompanyName =
      resolvedQuery?.company_name ||
      resolvedEntityName;

    const resolvedWebsite =
      resolvedQuery?.website ||
      undefined;

    const resolvedSegment =
      resolvedQuery?.segment ||
      undefined;

    const resolvedLocation =
      resolvedQuery?.location ||
      undefined;

    console.log(
      'Automatic competitive discovery:',
      {
        entity:
          resolvedEntityName,
        segment:
          resolvedSegment || null,
        competitors:
          competitorNames,
      }
    );

    // STEP 1: dados da entidade
    console.log(
      'Step 1: Fetching company data...'
    );

    const companyProvider =
      new RealCompanyDataProvider();

    let companyData;

    const resolvedCnpj =
      resolvedQuery?.cnpj ||
      body.cnpj ||
      null;

    if (resolvedCnpj) {
      try {
        companyData =
          await companyProvider.lookup(
            resolvedCnpj
          );
      } catch (error) {
        console.warn(
          'CNPJ lookup failed, using resolved data',
          error
        );

        companyData = {
          cnpj:
            resolvedCnpj,
          company_name:
            resolvedCompanyName,
          status: null,
          opening_date: null,
          legal_nature: null,
          company_size: null,
          primary_cnae:
            resolvedSegment ||
            null,
          secondary_cnaes: null,
          capital_social: null,
          address: null,
          state:
            resolvedLocation ||
            null,
          description:
            resolvedQuery
              ?.description ||
            null,
          data_type:
            'ai_resolved' as const,
          source:
            'resolve_query',
          observed_at:
            new Date().toISOString(),
        };
      }
    } else {
      companyData = {
        cnpj: null,
        company_name:
          resolvedCompanyName,
        entity_name:
          resolvedEntityName,
        product_name:
          resolvedQuery
            ?.product_name ||
          null,
        status: null,
        opening_date: null,
        legal_nature: null,
        company_size: null,
        primary_cnae:
          resolvedSegment ||
          null,
        secondary_cnaes: null,
        capital_social: null,
        address: null,
        state:
          resolvedLocation ||
          null,
        description:
          resolvedQuery
            ?.description ||
          null,
        data_type:
          'ai_resolved' as const,
        source:
          'resolve_query',
        observed_at:
          new Date().toISOString(),
      };
    }

    // STEP 2: website
    console.log(
      'Step 2: Analyzing website...'
    );

    const websiteProvider =
      new RealWebsiteAnalysisProvider();

    let websiteData = null;

    if (resolvedWebsite) {
      try {
        websiteData =
          await websiteProvider.analyze(
            resolvedWebsite
          );
      } catch (error) {
        console.warn(
          'Website analysis failed:',
          error
        );

        websiteData = null;
      }
    }

    // STEP 3: AI Visibility + benchmark
    console.log(
      'Step 3: Analyzing AI visibility and benchmark...'
    );

    let aiVisibilityFromAPI: any =
      null;
    let aiObservations: any[] = [];
    let aiProviders: any = {};
    let aiBenchmark: any = null;

    try {
      const aiResponse =
        await fetch(
          `${baseUrl}/api/ai-visibility`,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              query:
                resolvedEntityName,
              company_name:
                resolvedEntityName,
              website:
                resolvedWebsite,
              segment:
                resolvedSegment,
              location:
                resolvedLocation,
              country:
                resolvedLocation ||
                'Brasil',
              competitors:
                competitorNames,
            }),
            cache: 'no-store',
          }
        );

      if (!aiResponse.ok) {
        const errorText =
          await aiResponse.text();

        throw new Error(
          `AI Visibility API ${aiResponse.status}: ${errorText}`
        );
      }

      const aiData =
        await aiResponse.json();

      aiVisibilityFromAPI =
        aiData.ai_visibility ||
        aiData.summary ||
        null;

      aiProviders =
        aiData.by_model || {};

      aiBenchmark =
        aiData.benchmark || null;

      if (aiBenchmark) {
        const similarityByName =
          new Map<
            string,
            {
              why_similar: string | null;
              similarities: string[];
              entity_type: string | null;
            }
          >();

        discoveredCompetitors.forEach(
          (item: any) => {
            similarityByName.set(
              String(item.name)
                .trim()
                .toLowerCase(),
              {
                why_similar:
                  item.why_similar ||
                  null,
                similarities:
                  Array.isArray(
                    item.similarities
                  )
                    ? item.similarities
                        .filter(
                          (
                            value: unknown
                          ): value is string =>
                            typeof value ===
                            'string'
                        )
                    : [],
                entity_type:
                  typeof item.entity_type ===
                  'string'
                    ? item.entity_type
                    : null,
              }
            );
          }
        );

        const enrichEntry =
          (entry: any) => {
            if (!entry) return entry;

            const metadata =
              similarityByName.get(
                String(
                  entry.name ||
                    ''
                )
                  .trim()
                  .toLowerCase()
              );

            return metadata
              ? {
                  ...entry,
                  ...metadata,
                }
              : entry;
          };

        aiBenchmark = {
          ...aiBenchmark,

          competitors:
            Array.isArray(
              aiBenchmark.competitors
            )
              ? aiBenchmark.competitors.map(
                  enrichEntry
                )
              : [],

          ranking:
            Array.isArray(
              aiBenchmark.ranking
            )
              ? aiBenchmark.ranking.map(
                  enrichEntry
                )
              : [],
        };

        const comparableRanking =
          Array.isArray(
            aiBenchmark.ranking
          )
            ? aiBenchmark.ranking.filter(
                (entry: any) =>
                  entry?.status ===
                    'available' &&
                  typeof entry?.score ===
                    'number' &&
                  Number.isFinite(
                    entry.score
                  )
              )
            : [];

        if (
          comparableRanking.length < 2
        ) {
          aiBenchmark = {
            ...aiBenchmark,
            company_rank:
              null,
            company_gap_to_leader:
              null,
            leader:
              null,
            benchmark_valid:
              false,
            benchmark_message:
              'Benchmark ainda não disponível: são necessárias pelo menos 2 entidades com score válido.',
          };
        } else {
          aiBenchmark = {
            ...aiBenchmark,
            benchmark_valid:
              true,
            benchmark_message:
              null,
          };
        }
      }

      const providerResults =
        Object.values(
          aiProviders
        ) as any[];

      aiObservations =
        providerResults
          .filter(
            (provider) =>
              provider?.success ===
                true &&
              Array.isArray(
                provider
                  ?.observations
              )
          )
          .flatMap(
            (provider) =>
              provider.observations
          );

      console.log(
        'AI visibility completed:',
        {
          score:
            aiVisibilityFromAPI
              ?.score ?? null,
          coverage:
            aiVisibilityFromAPI
              ?.coverage ?? 0,
          models_available:
            aiVisibilityFromAPI
              ?.models_available ??
            0,
          models_requested:
            aiVisibilityFromAPI
              ?.models_requested ??
            3,
          observations_received:
            aiObservations.length,
          discovered_competitors:
            competitorNames.length,
          benchmark_valid:
            aiBenchmark
              ?.benchmark_valid ??
            false,
        }
      );
    } catch (error) {
      console.warn(
        'AI visibility analysis failed:',
        error
      );

      aiVisibilityFromAPI =
        null;
      aiProviders = {};
      aiBenchmark = null;
      aiObservations = [];
    }

    // STEP 4: financial strength
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

    // STEP 5: normalize AI visibility
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
        methodology_version:
          'ai-visibility-v1.1',
      };

    const safeAIVisibilityScore =
      typeof aiVisibilityResult.score ===
        'number' &&
      Number.isFinite(
        aiVisibilityResult.score
      )
        ? aiVisibilityResult.score
        : 0;

    // STEP 6: competitive position derived from real rank only
    let competitivePosition:
      number | null = null;

    const validRanking =
      aiBenchmark
        ?.benchmark_valid &&
      Array.isArray(
        aiBenchmark?.ranking
      )
        ? aiBenchmark.ranking.filter(
            (entry: any) =>
              entry?.status ===
                'available' &&
              typeof entry?.score ===
                'number' &&
              Number.isFinite(
                entry.score
              ) &&
              typeof entry?.rank ===
                'number'
          )
        : [];

    const primaryRankingEntry =
      validRanking.find(
        (entry: any) =>
          entry
            ?.is_primary === true
      );

    if (
      primaryRankingEntry &&
      validRanking.length >= 2
    ) {
      competitivePosition =
        Math.round(
          ((validRanking.length -
            primaryRankingEntry.rank) /
            (validRanking.length -
              1)) *
            100
        );
    }

    // STEP 7: digital authority only with actual website analysis
    const digitalAuthority =
      websiteData
        ? Math.min(
            100,
            50 +
              (websiteData.word_count >
              1000
                ? 15
                : 5) +
              (websiteData.has_contact_info
                ? 10
                : 0) +
              (websiteData.has_about
                ? 10
                : 0) +
              (websiteData.structured_data
                ? 10
                : 0)
          )
        : null;

    // STEP 8: ABVS only when required verified inputs exist
    let abvsResult: any = {
      score: null,
      is_available: false,
      reason:
        'ABVS indisponível nesta leitura por falta de dimensões verificáveis.',
    };

    if (
      competitivePosition !== null &&
      digitalAuthority !== null
    ) {
      console.log(
        'Step 8: Calculating ABVS...'
      );

      const abvsEngine =
        new ABVSEngine();

      abvsResult =
        abvsEngine.calculate({
          aiVisibility:
            safeAIVisibilityScore,
          financialStrength:
            financialResult.score,
          competitivePosition,
          digitalAuthority:
            Math.round(
              digitalAuthority
            ),
        });
    } else {
      console.log(
        'Step 8: ABVS skipped because verified competitive/digital inputs are unavailable.'
      );
    }

    // STEP 9: gap
    const gapCalc =
      new GapCalculator();

    const gapResult =
      gapCalc.calculate(
        financialResult.score,
        safeAIVisibilityScore
      );

    // STEP 10: action plan
    const actionPlanGen =
      new ActionPlanGenerator();

    const actions =
      actionPlanGen.generate(
        safeAIVisibilityScore,
        financialResult.score,
        gapResult.gap,
        financialResult
          .data_type.length > 0
      );

    const diagnostic = {
      company:
        companyData,

      resolved_entity: {
        original_query:
          query,
        entity_name:
          resolvedEntityName,
        intent:
          resolvedQuery
            ?.intent ||
          'unknown',
        segment:
          resolvedSegment ||
          null,
        description:
          resolvedQuery
            ?.description ||
          null,
        confidence:
          resolvedQuery
            ?.confidence ||
          'low',
        competitors:
          discoveredCompetitors,
      },

      website:
        websiteData,

      financial:
        financialResult,

      ai_visibility: {
        ...aiVisibilityResult,
        providers:
          aiVisibilityResult
            .providers ||
          aiProviders,
      },

      benchmark:
        aiBenchmark,

      competitive_position:
        competitivePosition,

      digital_authority:
        digitalAuthority ===
        null
          ? null
          : Math.round(
              digitalAuthority
            ),

      abvs:
        abvsResult,

      gap:
        gapResult,

      actions,

      data_quality: {
        company_data:
          companyData.data_type,
        website_data:
          websiteData?.data_type ||
          'unavailable',
        ai_observations:
          aiVisibilityResult
            ?.observations_count ??
          aiObservations.length,
        ai_models_requested:
          aiVisibilityResult
            ?.models_requested ??
          3,
        ai_models_available:
          aiVisibilityResult
            ?.models_available ??
          0,
        ai_coverage:
          aiVisibilityResult
            ?.coverage ??
          0,
        financial_data:
          financialResult.data_type,
        competitor_discovery:
          discoveredCompetitors.length >
          0
            ? 'ai_discovered'
            : 'unavailable',
        benchmark:
          aiBenchmark
            ?.benchmark_valid
            ? 'valid'
            : 'insufficient_comparable_entities',
      },

      request_context: {
        intent:
          resolvedQuery
            ?.intent ||
          null,

        data_sources: [
          ...data_sources,
          ...(
            Array.isArray(
              resolvedQuery
                ?.data_sources
            )
              ? resolvedQuery
                  .data_sources
              : []
          ),
        ],

        confidence,

        competitors:
          competitorNames,

        competitor_details:
          discoveredCompetitors,

        query,

        segment:
          resolvedSegment ||
          null,

        location:
          resolvedLocation ||
          null,
      },

      timestamp:
        new Date().toISOString(),
    };

    // STEP 11: persist history
    console.log(
      'Step 11: Persisting diagnostic history...'
    );

    const persistence =
      await persistDiagnostic({
        diagnostic,
        body: {
          ...body,
          company_name:
            resolvedCompanyName,
          website:
            resolvedWebsite,
          segment:
            resolvedSegment,
          location:
            resolvedLocation,
          competitors:
            competitorNames,
        },
        aiProviders,
        aiBenchmark,
      });

    if (!persistence.saved) {
      console.warn(
        'Diagnostic returned without persistence:',
        persistence.error
      );
    } else {
      console.log(
        'Diagnostic persistence completed:',
        {
          diagnostic_id:
            persistence.diagnostic_id,
          providers_saved:
            persistence.providers_saved ??
            0,
          observations_saved:
            persistence.observations_saved ??
            0,
          competitors_saved:
            persistence.competitors_saved ??
            0,
        }
      );
    }

    return NextResponse.json({
      ...diagnostic,
      persistence,
    });
  } catch (error) {
    console.error(
      'Diagnosis error:',
      error
    );

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
