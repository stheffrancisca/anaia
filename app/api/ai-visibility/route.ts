import { NextRequest, NextResponse } from 'next/server';
import { analyzeWithAllModels } from '@/lib/ai-aggregator';
import type {
  AIAnalysisInput,
  AICompetitiveBenchmarkEntry,
  AICompetitiveBenchmarkResult,
  AIProviderAvailabilitySummary,
  AggregatedAIVisibilityResult,
} from '@/lib/ai-providers/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const MAX_BENCHMARK_COMPETITORS = 3;

function cleanString(value: unknown): string | null {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null;
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item: unknown): item is string =>
        typeof item === 'string'
    )
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeCompanyName(input: AIAnalysisInput): string {
  return (
    input.company_name ||
    input.query ||
    input.website ||
    input.cnpj ||
    'Empresa analisada'
  );
}

function summarizeProvider(
  provider:
    | AggregatedAIVisibilityResult['providers']['openai']
    | AggregatedAIVisibilityResult['providers']['anthropic']
    | AggregatedAIVisibilityResult['providers']['gemini']
    | undefined
): AIProviderAvailabilitySummary | null {
  if (!provider) {
    return null;
  }

  return {
    success: provider.success,
    model: provider.model || null,
    score:
      provider.success && Number.isFinite(provider.score)
        ? provider.score
        : null,
    observations_count:
      provider.observations_count || 0,
    error: provider.error || null,
  };
}

function buildBenchmarkEntry(
  name: string,
  isPrimary: boolean,
  result: AggregatedAIVisibilityResult
): AICompetitiveBenchmarkEntry {
  const available =
    result.models_available > 0 &&
    result.score !== null &&
    Number.isFinite(result.score);

  return {
    name,
    is_primary: isPrimary,
    status: available
      ? 'available'
      : 'unavailable',
    score: available
      ? result.score
      : null,
    confidence: result.confidence,
    coverage: result.coverage,
    models_available:
      result.models_available,
    models_requested:
      result.models_requested,
    observations_count:
      result.observations_count,
    rank: null,
    gap_to_leader: null,
    providers: {
      openai:
        summarizeProvider(
          result.providers.openai
        ),
      anthropic:
        summarizeProvider(
          result.providers.anthropic
        ),
      gemini:
        summarizeProvider(
          result.providers.gemini
        ),
    },
  };
}

function applyRanking(
  companyEntry: AICompetitiveBenchmarkEntry,
  competitorEntries: AICompetitiveBenchmarkEntry[]
): AICompetitiveBenchmarkResult {
  const availableEntries = [
    companyEntry,
    ...competitorEntries,
  ]
    .filter(
      (
        entry
      ): entry is AICompetitiveBenchmarkEntry & {
        score: number;
      } =>
        entry.status === 'available' &&
        typeof entry.score === 'number' &&
        Number.isFinite(entry.score)
    )
    .sort(
      (a, b) =>
        b.score - a.score
    );

  const leaderScore =
    availableEntries[0]?.score ?? null;

  const rankedEntries =
    availableEntries.map(
      (entry, index) => ({
        ...entry,
        rank: index + 1,
        gap_to_leader:
          leaderScore === null
            ? null
            : Math.round(
                (leaderScore -
                  entry.score) *
                  10
              ) / 10,
      })
    );

  const rankingByName = new Map(
    rankedEntries.map((entry) => [
      `${entry.is_primary}:${entry.name}`,
      entry,
    ])
  );

  const finalCompany =
    rankingByName.get(
      `true:${companyEntry.name}`
    ) || companyEntry;

  const finalCompetitors =
    competitorEntries.map(
      (entry) =>
        rankingByName.get(
          `false:${entry.name}`
        ) || entry
    );

  const finalRanking = [
    finalCompany,
    ...finalCompetitors,
  ]
    .filter(
      (entry) =>
        entry.rank !== null
    )
    .sort(
      (a, b) =>
        (a.rank || 999) -
        (b.rank || 999)
    );

  const leader =
    finalRanking[0] &&
    typeof finalRanking[0].score ===
      'number'
      ? {
          name: finalRanking[0].name,
          score:
            finalRanking[0].score,
          is_primary:
            finalRanking[0]
              .is_primary,
        }
      : null;

  return {
    max_competitors:
      MAX_BENCHMARK_COMPETITORS,
    requested_competitors:
      competitorEntries.length,
    analyzed_competitors:
      finalCompetitors.filter(
        (entry) =>
          entry.status === 'available'
      ).length,
    company: finalCompany,
    competitors: finalCompetitors,
    ranking: finalRanking,
    leader,
    company_rank:
      finalCompany.rank,
    company_gap_to_leader:
      finalCompany.gap_to_leader,
    generated_at:
      new Date().toISOString(),
  };
}

async function analyzeCompetitor(
  competitorName: string,
  primaryCompanyName: string,
  baseInput: AIAnalysisInput,
  peerNames: string[]
): Promise<AICompetitiveBenchmarkEntry> {
  const competitorInput: AIAnalysisInput = {
    query: competitorName,
    company_name:
      competitorName,
    website: null,
    cnpj: null,
    segment:
      baseInput.segment || null,
    location:
      baseInput.location || null,
    country:
      baseInput.country || 'Brasil',
    products_services:
      baseInput.products_services || [],
    competitors: [
      primaryCompanyName,
      ...peerNames.filter(
        (name) =>
          name !== competitorName
      ),
    ],
  };

  try {
    const result =
      await analyzeWithAllModels(
        competitorInput
      );

    return buildBenchmarkEntry(
      competitorName,
      false,
      result
    );
  } catch (error) {
    const technicalError =
      error instanceof Error
        ? error.message
        : String(error);

    return {
      name: competitorName,
      is_primary: false,
      status: 'unavailable',
      score: null,
      confidence: 0,
      coverage: 0,
      models_available: 0,
      models_requested: 3,
      observations_count: 0,
      rank: null,
      gap_to_leader: null,
      providers: {
        openai: {
          success: false,
          model: null,
          score: null,
          observations_count: 0,
          error:
            `FORA_DO_AR_002 | Benchmark indisponível. | Detalhe: ${technicalError}`,
        },
        anthropic: null,
        gemini: null,
      },
    };
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const input: AIAnalysisInput = {
      query:
        cleanString(body?.query) || '',

      company_name:
        cleanString(
          body?.company_name
        ),

      website:
        cleanString(body?.website),

      cnpj:
        cleanString(body?.cnpj),

      segment:
        cleanString(body?.segment),

      location:
        cleanString(body?.location),

      country:
        cleanString(body?.country) ||
        'Brasil',

      competitors:
        cleanStringArray(
          body?.competitors
        ),

      products_services:
        cleanStringArray(
          body?.products_services
        ),
    };

    const hasAnyUsefulInput = Boolean(
      input.query ||
        input.company_name ||
        input.website ||
        input.cnpj ||
        input.segment
    );

    if (!hasAnyUsefulInput) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Informe uma empresa, marca, site, CNPJ, segmento ou palavra-chave.',
        },
        {
          status: 400,
        }
      );
    }

    const primaryCompanyName =
      normalizeCompanyName(input);

    const requestedCompetitors =
      (input.competitors || [])
        .filter(
          (name) =>
            name.toLowerCase() !==
            primaryCompanyName.toLowerCase()
        )
        .filter(
          (name, index, array) =>
            array.findIndex(
              (candidate) =>
                candidate.toLowerCase() ===
                name.toLowerCase()
            ) === index
        )
        .slice(
          0,
          MAX_BENCHMARK_COMPETITORS
        );

    /*
      PERFORMANCE:
      Empresa principal e concorrentes começam ao mesmo tempo.
      Antes, a rota esperava a empresa terminar e só depois
      iniciava o benchmark, o que facilmente ultrapassava 60s.
    */
    const primaryPromise =
      analyzeWithAllModels(input);

    const competitorsPromise =
      requestedCompetitors.length > 0
        ? Promise.all(
            requestedCompetitors.map(
              (competitorName) =>
                analyzeCompetitor(
                  competitorName,
                  primaryCompanyName,
                  input,
                  requestedCompetitors
                )
            )
          )
        : Promise.resolve(
            [] as AICompetitiveBenchmarkEntry[]
          );

    const [
      primaryResult,
      competitorEntries,
    ] = await Promise.all([
      primaryPromise,
      competitorsPromise,
    ]);

    if (
      primaryResult.models_available ===
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Nenhum provedor de IA conseguiu concluir a análise.',
          ai_visibility:
            primaryResult,
        },
        {
          status: 503,
        }
      );
    }

    const companyEntry =
      buildBenchmarkEntry(
        primaryCompanyName,
        true,
        primaryResult
      );

    const benchmark =
      applyRanking(
        companyEntry,
        competitorEntries
      );

    return NextResponse.json(
      {
        success: true,

        ai_visibility:
          primaryResult,

        summary: {
          score:
            primaryResult.score,

          confidence:
            primaryResult.confidence,

          coverage:
            primaryResult.coverage,

          cross_model_consistency:
            primaryResult
              .cross_model_consistency,

          models_available:
            primaryResult
              .models_available,

          models_requested:
            primaryResult
              .models_requested,

          observations_count:
            primaryResult
              .observations_count,
        },

        by_model: {
          openai:
            summarizeProvider(
              primaryResult
                .providers.openai
            ),

          anthropic:
            summarizeProvider(
              primaryResult
                .providers.anthropic
            ),

          gemini:
            summarizeProvider(
              primaryResult
                .providers.gemini
            ),
        },

        dimensions:
          primaryResult.dimensions,

        benchmark,

        methodology_version:
          primaryResult
            .methodology_version,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      '[AI Visibility API] error:',
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : 'Erro interno ao executar análise multi-IA.',
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      service:
        'ANAIA AI Visibility',

      status: 'online',

      methodology:
        'multi-provider',

      competitive_benchmark: {
        enabled: true,
        max_competitors:
          MAX_BENCHMARK_COMPETITORS,
      },

      providers: [
        {
          name: 'openai',
          configured: Boolean(
            process.env.OPENAI_API_KEY
          ),
        },
        {
          name: 'anthropic',
          configured: Boolean(
            process.env
              .ANTHROPIC_API_KEY
          ),
        },
        {
          name: 'gemini',
          configured: Boolean(
            process.env.GEMINI_API_KEY
          ),
        },
      ],
    },
    {
      status: 200,
    }
  );
}
