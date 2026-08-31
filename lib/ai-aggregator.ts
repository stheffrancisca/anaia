import {
  AggregatedAIVisibilityResult,
  AIAnalysisInput,
  AIProviderResult,
  AIVisibilityDimensions,
} from './ai-providers/types';

import { analyzeWithOpenAI } from './ai-providers/openai';
import { analyzeWithAnthropic } from './ai-providers/anthropic';
import { analyzeWithGemini } from './ai-providers/gemini';

const METHODOLOGY_VERSION = 'ai-visibility-v1.0';

function clamp(value: number, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

function average(values: number[]) {
  if (values.length === 0) return 0;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function emptyDimensions(): AIVisibilityDimensions {
  return {
    presence: 0,
    recommendation: 0,
    position: 0,
    relevance: 0,
    competitive_share: 0,
    consistency: 0,
  };
}

function calculateCrossModelConsistency(
  validResults: AIProviderResult[]
): number {
  if (validResults.length <= 1) {
    return validResults.length === 1 ? 50 : 0;
  }

  const scores = validResults.map((result) => result.score);

  const mean = average(scores);

  const variance =
    scores.reduce((sum, score) => {
      return sum + Math.pow(score - mean, 2);
    }, 0) / scores.length;

  const standardDeviation = Math.sqrt(variance);

  // Quanto maior a dispersão entre os modelos, menor a consistência.
  return clamp(100 - standardDeviation * 2.5);
}

function calculateCoverage(
  validResults: AIProviderResult[],
  modelsRequested: number
): number {
  if (modelsRequested === 0) return 0;

  return clamp(
    (validResults.length / modelsRequested) * 100
  );
}

function calculateConfidence(params: {
  coverage: number;
  crossModelConsistency: number;
  validResults: AIProviderResult[];
}): number {
  const {
    coverage,
    crossModelConsistency,
    validResults,
  } = params;

  if (validResults.length === 0) {
    return 0;
  }

  const providerConsistencyAverage = average(
    validResults.map(
      (result) => result.dimensions.consistency
    )
  );

  const observationsTotal = validResults.reduce(
    (sum, result) => {
      return sum + result.observations_count;
    },
    0
  );

  /*
    30 observações = 100% de profundidade esperada no MVP
    10 prompts por modelo × 3 modelos
  */
  const observationDepth = clamp(
    (observationsTotal / 30) * 100
  );

  const confidence =
    coverage * 0.35 +
    crossModelConsistency * 0.3 +
    providerConsistencyAverage * 0.2 +
    observationDepth * 0.15;

  return clamp(confidence);
}

function aggregateDimensions(
  validResults: AIProviderResult[]
): AIVisibilityDimensions {
  if (validResults.length === 0) {
    return emptyDimensions();
  }

  return {
    presence: average(
      validResults.map(
        (result) => result.dimensions.presence
      )
    ),

    recommendation: average(
      validResults.map(
        (result) => result.dimensions.recommendation
      )
    ),

    position: average(
      validResults.map(
        (result) => result.dimensions.position
      )
    ),

    relevance: average(
      validResults.map(
        (result) => result.dimensions.relevance
      )
    ),

    competitive_share: average(
      validResults.map(
        (result) =>
          result.dimensions.competitive_share
      )
    ),

    consistency: average(
      validResults.map(
        (result) => result.dimensions.consistency
      )
    ),
  };
}

export async function analyzeWithAllModels(
  input: AIAnalysisInput
): Promise<AggregatedAIVisibilityResult> {
  const modelsRequested = 3;

  const settledResults = await Promise.allSettled([
    analyzeWithOpenAI(input),
    analyzeWithAnthropic(input),
    analyzeWithGemini(input),
  ]);

  const providerResults: AIProviderResult[] =
    settledResults.map(
      (result, index): AIProviderResult => {
        if (result.status === 'fulfilled') {
          return result.value;
        }

        const provider =
          index === 0
            ? 'openai'
            : index === 1
            ? 'anthropic'
            : 'gemini';

        return {
          provider,
          model: 'unknown',
          score: 0,
          dimensions: emptyDimensions(),
          observations: [],
          observations_count: 0,
          success: false,
          error:
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason),
        };
      }
    );

  const validResults = providerResults.filter(
    (result) =>
      result.success &&
      result.observations_count > 0 &&
      Number.isFinite(result.score)
  );

  const score =
    validResults.length > 0
      ? average(
          validResults.map(
            (result) => result.score
          )
        )
      : null;

  const crossModelConsistency =
    calculateCrossModelConsistency(
      validResults
    );

  const coverage =
    calculateCoverage(
      validResults,
      modelsRequested
    );

  const confidence =
    calculateConfidence({
      coverage,
      crossModelConsistency,
      validResults,
    });

  const dimensions =
    aggregateDimensions(validResults);

  const observationsCount =
    validResults.reduce(
      (sum, result) =>
        sum + result.observations_count,
      0
    );

  const providers: AggregatedAIVisibilityResult['providers'] =
    {};

  for (const result of providerResults) {
    if (result.provider === 'openai') {
      providers.openai = result;
    }

    if (result.provider === 'anthropic') {
      providers.anthropic = result;
    }

    if (result.provider === 'gemini') {
      providers.gemini = result;
    }
  }

  return {
    score:
      score === null
        ? null
        : round1(score),

    confidence:
      round1(confidence),

    coverage:
      round1(coverage),

    cross_model_consistency:
      round1(
        crossModelConsistency
      ),

    models_requested:
      modelsRequested,

    models_available:
      validResults.length,

    providers,

    dimensions: {
      presence:
        round1(dimensions.presence),

      recommendation:
        round1(
          dimensions.recommendation
        ),

      position:
        round1(dimensions.position),

      relevance:
        round1(dimensions.relevance),

      competitive_share:
        round1(
          dimensions.competitive_share
        ),

      consistency:
        round1(
          dimensions.consistency
        ),
    },

    observations_count:
      observationsCount,

    methodology_version:
      METHODOLOGY_VERSION,
  };
}