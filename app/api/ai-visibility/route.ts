import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  analyzeWithAllModels,
} from '@/lib/ai-aggregator';

import type {
  AIAnalysisInput,
  AICompetitiveBenchmarkEntry,
  AICompetitiveBenchmarkResult,
  AIProviderAvailabilitySummary,
  AIObservation,
  AggregatedAIVisibilityResult,
} from '@/lib/ai-providers/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const MAX_BENCHMARK_COMPETITORS = 3;
const MIN_VALID_ENTITIES_FOR_RANKING = 2;

type ProviderSummaryWithObservations =
  AIProviderAvailabilitySummary & {
    observations: AIObservation[];
  };

function cleanString(value: unknown): string | null {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null;
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item: unknown): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeKey(value: string): string {
  return value.trim().toLocaleLowerCase('pt-BR');
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

function uniqueCaseInsensitive(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const name of names) {
    const cleaned = name.trim();
    if (!cleaned) continue;

    const key = normalizeKey(cleaned);
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(cleaned);
  }

  return result;
}

function buildBenchmarkUniverse(
  primaryCompanyName: string,
  requestedCompetitors: string[]
): string[] {
  return uniqueCaseInsensitive([
    primaryCompanyName,
    ...requestedCompetitors,
  ]).sort((a, b) =>
    a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
  );
}

function buildSymmetricEntityInput(
  entityName: string,
  baseInput: AIAnalysisInput,
  benchmarkUniverse: string[]
): AIAnalysisInput {
  const entityKey = normalizeKey(entityName);

  const peerNames = benchmarkUniverse.filter(
    (name) => normalizeKey(name) !== entityKey
  );

  return {
    query: entityName,
    company_name: entityName,
    website: null,
    cnpj: null,
    segment: baseInput.segment || null,
    location: baseInput.location || null,
    country: baseInput.country || 'Brasil',
    products_services: baseInput.products_services || [],
    competitors: peerNames,
  };
}

function summarizeProvider(
  provider:
    | AggregatedAIVisibilityResult['providers']['openai']
    | AggregatedAIVisibilityResult['providers']['anthropic']
    | AggregatedAIVisibilityResult['providers']['gemini']
    | undefined
): ProviderSummaryWithObservations | null {
  if (!provider) return null;

  return {
    success: provider.success,
    model: provider.model || null,
    score:
      provider.success && Number.isFinite(provider.score)
        ? provider.score
        : null,
    observations_count: provider.observations_count || 0,
    error: provider.error || null,
    observations: Array.isArray(provider.observations)
      ? provider.observations
      : [],
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
    status: available ? 'available' : 'unavailable',
    score: available ? result.score : null,
    confidence: result.confidence,
    coverage: result.coverage,
    models_available: result.models_available,
    models_requested: result.models_requested,
    observations_count: result.observations_count,
    rank: null,
    gap_to_leader: null,
    providers: {
      openai: summarizeProvider(result.providers.openai),
      anthropic: summarizeProvider(result.providers.anthropic),
      gemini: summarizeProvider(result.providers.gemini),
    },
  };
}

function unavailableBenchmarkEntry(
  name: string,
  isPrimary: boolean,
  technicalError: string
): AICompetitiveBenchmarkEntry {
  return {
    name,
    is_primary: isPrimary,
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
        error: `FORA_DO_AR_002 | Benchmark indisponível. | Detalhe: ${technicalError}`,
      },
      anthropic: null,
      gemini: null,
    },
  };
}

function applyRanking(
  companyEntry: AICompetitiveBenchmarkEntry,
  competitorEntries: AICompetitiveBenchmarkEntry[]
): AICompetitiveBenchmarkResult & {
  benchmark_valid: boolean;
  benchmark_message: string | null;
  valid_entities: number;
} {
  const allEntries = [companyEntry, ...competitorEntries];

  const availableEntries = allEntries.filter(
    (
      entry
    ): entry is AICompetitiveBenchmarkEntry & {
      score: number;
    } =>
      entry.status === 'available' &&
      typeof entry.score === 'number' &&
      Number.isFinite(entry.score)
  );

  const benchmarkValid =
    availableEntries.length >= MIN_VALID_ENTITIES_FOR_RANKING;

  if (!benchmarkValid) {
    return {
      max_competitors: MAX_BENCHMARK_COMPETITORS,
      requested_competitors: competitorEntries.length,
      analyzed_competitors: competitorEntries.filter(
        (entry) => entry.status === 'available'
      ).length,
      company: {
        ...companyEntry,
        rank: null,
        gap_to_leader: null,
      },
      competitors: competitorEntries.map((entry) => ({
        ...entry,
        rank: null,
        gap_to_leader: null,
      })),
      ranking: [],
      leader: null,
      company_rank: null,
      company_gap_to_leader: null,
      generated_at: new Date().toISOString(),
      benchmark_valid: false,
      benchmark_message:
        'Benchmark indisponível: são necessárias pelo menos 2 entidades com leitura válida na mesma execução.',
      valid_entities: availableEntries.length,
    };
  }

  const sortedAvailable = [...availableEntries].sort((a, b) => {
    const scoreDiff = b.score - a.score;

    if (Math.abs(scoreDiff) > 0.000001) {
      return scoreDiff;
    }

    return a.name.localeCompare(b.name, 'pt-BR', {
      sensitivity: 'base',
    });
  });

  const leaderScore = sortedAvailable[0]?.score ?? null;

  const rankedEntries = sortedAvailable.map((entry, index) => ({
    ...entry,
    rank: index + 1,
    gap_to_leader:
      leaderScore === null
        ? null
        : Math.round((leaderScore - entry.score) * 10) / 10,
  }));

  const rankingByKey = new Map(
    rankedEntries.map((entry) => [
      `${entry.is_primary}:${normalizeKey(entry.name)}`,
      entry,
    ])
  );

  const finalCompany =
    rankingByKey.get(`true:${normalizeKey(companyEntry.name)}`) || {
      ...companyEntry,
      rank: null,
      gap_to_leader: null,
    };

  const finalCompetitors = competitorEntries.map(
    (entry) =>
      rankingByKey.get(`false:${normalizeKey(entry.name)}`) || {
        ...entry,
        rank: null,
        gap_to_leader: null,
      }
  );

  const finalRanking = [finalCompany, ...finalCompetitors]
    .filter((entry) => entry.rank !== null)
    .sort((a, b) => (a.rank || 999) - (b.rank || 999));

  const leader =
    finalRanking[0] && typeof finalRanking[0].score === 'number'
      ? {
          name: finalRanking[0].name,
          score: finalRanking[0].score,
          is_primary: finalRanking[0].is_primary,
        }
      : null;

  return {
    max_competitors: MAX_BENCHMARK_COMPETITORS,
    requested_competitors: competitorEntries.length,
    analyzed_competitors: finalCompetitors.filter(
      (entry) => entry.status === 'available'
    ).length,
    company: finalCompany,
    competitors: finalCompetitors,
    ranking: finalRanking,
    leader,
    company_rank: finalCompany.rank,
    company_gap_to_leader: finalCompany.gap_to_leader,
    generated_at: new Date().toISOString(),
    benchmark_valid: true,
    benchmark_message: null,
    valid_entities: availableEntries.length,
  };
}

async function analyzeEntityForBenchmark(
  entityName: string,
  isPrimary: boolean,
  baseInput: AIAnalysisInput,
  benchmarkUniverse: string[]
): Promise<{
  entry: AICompetitiveBenchmarkEntry;
  raw: AggregatedAIVisibilityResult | null;
}> {
  const symmetricInput = buildSymmetricEntityInput(
    entityName,
    baseInput,
    benchmarkUniverse
  );

  try {
    const result = await analyzeWithAllModels(symmetricInput);

    return {
      entry: buildBenchmarkEntry(entityName, isPrimary, result),
      raw: result,
    };
  } catch (error) {
    const technicalError =
      error instanceof Error ? error.message : String(error);

    return {
      entry: unavailableBenchmarkEntry(
        entityName,
        isPrimary,
        technicalError
      ),
      raw: null,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const input: AIAnalysisInput = {
      query: cleanString(body?.query) || '',
      company_name: cleanString(body?.company_name),
      website: cleanString(body?.website),
      cnpj: cleanString(body?.cnpj),
      segment: cleanString(body?.segment),
      location: cleanString(body?.location),
      country: cleanString(body?.country) || 'Brasil',
      competitors: cleanStringArray(body?.competitors),
      products_services: cleanStringArray(body?.products_services),
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
        { status: 400 }
      );
    }

    const primaryCompanyName = normalizeCompanyName(input);

    const requestedCompetitors = uniqueCaseInsensitive(
      input.competitors || []
    )
      .filter(
        (name) =>
          normalizeKey(name) !== normalizeKey(primaryCompanyName)
      )
      .slice(0, MAX_BENCHMARK_COMPETITORS);

    const benchmarkUniverse = buildBenchmarkUniverse(
      primaryCompanyName,
      requestedCompetitors
    );

    const analyzed = await Promise.all(
      benchmarkUniverse.map((entityName) =>
        analyzeEntityForBenchmark(
          entityName,
          normalizeKey(entityName) === normalizeKey(primaryCompanyName),
          input,
          benchmarkUniverse
        )
      )
    );

    const primaryAnalysis = analyzed.find(
      ({ entry }) => entry.is_primary
    );

    if (
      !primaryAnalysis ||
      !primaryAnalysis.raw ||
      primaryAnalysis.raw.models_available === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Nenhum provedor de IA conseguiu concluir a análise da entidade principal.',
          ai_visibility: primaryAnalysis?.raw || null,
        },
        { status: 503 }
      );
    }

    const primaryResult = primaryAnalysis.raw;
    const companyEntry = primaryAnalysis.entry;

    const competitorEntries = analyzed
      .filter(({ entry }) => !entry.is_primary)
      .map(({ entry }) => entry);

    const benchmark = applyRanking(
      companyEntry,
      competitorEntries
    );

    const byModel = {
      openai: summarizeProvider(primaryResult.providers.openai),
      anthropic: summarizeProvider(primaryResult.providers.anthropic),
      gemini: summarizeProvider(primaryResult.providers.gemini),
    };

    return NextResponse.json(
      {
        success: true,
        ai_visibility: primaryResult,
        summary: {
          score: primaryResult.score,
          confidence: primaryResult.confidence,
          coverage: primaryResult.coverage,
          cross_model_consistency:
            primaryResult.cross_model_consistency,
          models_available: primaryResult.models_available,
          models_requested: primaryResult.models_requested,
          observations_count: primaryResult.observations_count,
        },
        by_model: byModel,
        dimensions: primaryResult.dimensions,
        benchmark: {
          ...benchmark,
          comparison_universe: benchmarkUniverse,
          comparison_universe_size: benchmarkUniverse.length,
          ranking_scope: 'same_execution_same_peer_group',
          ranking_note: benchmark.benchmark_valid
            ? `Posição relativa entre ${benchmark.valid_entities} entidades com leitura válida nesta execução.`
            : benchmark.benchmark_message,
        },
        methodology_version: primaryResult.methodology_version,
        benchmark_methodology: {
          version: 'symmetric-peer-group-v1',
          same_peer_group: true,
          same_context: true,
          deterministic_tie_break: true,
          minimum_valid_entities: MIN_VALID_ENTITIES_FOR_RANKING,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[AI Visibility API] error:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro interno ao executar análise multi-IA.',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      service: 'ANAIA AI Visibility',
      status: 'online',
      methodology: 'multi-provider',
      competitive_benchmark: {
        enabled: true,
        max_competitors: MAX_BENCHMARK_COMPETITORS,
        methodology: 'symmetric-peer-group-v1',
        minimum_valid_entities: MIN_VALID_ENTITIES_FOR_RANKING,
        same_peer_group: true,
        same_context: true,
      },
      observation_persistence: {
        supported: true,
        description:
          'A rota POST expõe observações individuais por provedor para persistência no diagnóstico.',
      },
      providers: [
        {
          name: 'openai',
          configured: Boolean(process.env.OPENAI_API_KEY),
        },
        {
          name: 'anthropic',
          configured: Boolean(process.env.ANTHROPIC_API_KEY),
        },
        {
          name: 'gemini',
          configured: Boolean(process.env.GEMINI_API_KEY),
        },
      ],
    },
    { status: 200 }
  );
}
