import {
  AIAnalysisInput,
  AIObservation,
  AIProviderResult,
  AIVisibilityDimensions,
} from './types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || 'gemini-3.6-flash';

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/interactions';

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 45000;

const RETRYABLE_STATUS = new Set([
  429,
  500,
  502,
  503,
  504,
]);

type RawEvaluation = {
  presence: number;
  recommendation: number;
  position: number;
  relevance: number;
  competitive_share: number;
};

type InteractionResponse = {
  id?: string;
  model?: string;
  status?: string;

  steps?: Array<{
    type?: string;

    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

const EVALUATION_SCHEMA = {
  type: 'object',

  properties: {
    presence: {
      type: 'number',
    },

    recommendation: {
      type: 'number',
    },

    position: {
      type: 'number',
    },

    relevance: {
      type: 'number',
    },

    competitive_share: {
      type: 'number',
    },
  },

  required: [
    'presence',
    'recommendation',
    'position',
    'relevance',
    'competitive_share',
  ],
};

// ============================================================
// HELPERS
// ============================================================

function clamp(
  value: number,
  min = 0,
  max = 100
): number {
  return Math.min(
    Math.max(value, min),
    max
  );
}

function average(
  values: number[]
): number {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / values.length
  );
}

function round1(
  value: number
): number {
  return (
    Math.round(value * 10) /
    10
  );
}

function sleep(
  ms: number
): Promise<void> {
  return new Promise(
    (resolve) =>
      setTimeout(resolve, ms)
  );
}

function calculateScore(
  dimensions: AIVisibilityDimensions
): number {
  return (
    dimensions.presence * 0.25 +
    dimensions.recommendation * 0.25 +
    dimensions.position * 0.20 +
    dimensions.relevance * 0.15 +
    dimensions.competitive_share * 0.10 +
    dimensions.consistency * 0.05
  );
}

// ============================================================
// PROMPTS
// ============================================================

function buildPrompts(
  input: AIAnalysisInput
): string[] {
  const subject =
    input.company_name ||
    input.query ||
    input.website ||
    input.segment ||
    'empresa analisada';

  const segment =
    input.segment ||
    input.query ||
    'mercado relacionado';

  const location =
    input.location ||
    input.country ||
    'Brasil';

  return [
    `Quais são as principais empresas de ${segment} em ${location}?`,

    `Quais marcas você recomendaria para alguém procurando ${segment} em ${location}?`,

    `Quais são as melhores opções de ${segment} para empresas no Brasil?`,

    `Qual empresa você recomendaria para alguém avaliando soluções de ${segment}?`,

    `Quais empresas são referência em ${segment}?`,

    `Quais marcas possuem maior autoridade no mercado de ${segment}?`,

    `Compare ${subject} com outros concorrentes relevantes do segmento de ${segment}.`,

    `A empresa ${subject} seria uma recomendação competitiva dentro de ${segment}?`,

    `Se alguém procurasse por ${segment}, quais empresas provavelmente seriam consideradas primeiro?`,

    `Quais empresas se destacam atualmente quando o assunto é ${segment}?`,
  ];
}

// ============================================================
// GEMINI HTTP
// ============================================================

function getHeaders():
  Record<string, string> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      'GEMINI_API_KEY não configurada'
    );
  }

  return {
    'Content-Type':
      'application/json',

    'x-goog-api-key':
      GEMINI_API_KEY,
  };
}

async function readError(
  response: Response
): Promise<string> {
  try {
    return (
      (await response.text()) ||
      `HTTP ${response.status}`
    );
  } catch {
    return `HTTP ${response.status}`;
  }
}

function getRetryDelay(
  attempt: number
): number {
  const exponential =
    BASE_RETRY_DELAY_MS *
    Math.pow(2, attempt);

  const jitter =
    Math.floor(
      Math.random() * 400
    );

  return (
    exponential + jitter
  );
}

async function callInteraction(
  body: unknown,
  operation: string
): Promise<InteractionResponse> {
  let lastError:
    Error | null = null;

  for (
    let attempt = 0;
    attempt <= MAX_RETRIES;
    attempt++
  ) {
    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () =>
          controller.abort(),
        REQUEST_TIMEOUT_MS
      );

    try {
      const response =
        await fetch(
          GEMINI_ENDPOINT,
          {
            method: 'POST',

            headers:
              getHeaders(),

            body:
              JSON.stringify(body),

            signal:
              controller.signal,
          }
        );

      clearTimeout(timeout);

      if (response.ok) {
        return (
          await response.json()
        ) as InteractionResponse;
      }

      const errorText =
        await readError(
          response
        );

      const error =
        new Error(
          `${operation} ${response.status}: ${errorText}`
        );

      lastError = error;

      if (
        !RETRYABLE_STATUS.has(
          response.status
        )
      ) {
        throw error;
      }

      if (
        attempt >= MAX_RETRIES
      ) {
        throw error;
      }

      const delay =
        getRetryDelay(
          attempt
        );

      console.warn(
        `[Gemini] HTTP ${response.status}. ` +
        `Tentativa ${
          attempt + 2
        }/${MAX_RETRIES + 1} ` +
        `em ${delay}ms.`
      );

      await sleep(delay);
    } catch (error) {
      clearTimeout(timeout);

      const currentError =
        error instanceof Error
          ? error
          : new Error(
              'Erro desconhecido no Gemini'
            );

      lastError =
        currentError;

      const status =
        currentError.message.match(
          /\b(4\d{2}|5\d{2})\b/
        );

      if (status) {
        const code =
          Number(status[1]);

        if (
          !RETRYABLE_STATUS.has(
            code
          )
        ) {
          throw currentError;
        }
      }

      if (
        attempt >= MAX_RETRIES
      ) {
        throw currentError;
      }

      const delay =
        getRetryDelay(
          attempt
        );

      console.warn(
        `[Gemini] ${
          currentError.name ===
          'AbortError'
            ? 'timeout'
            : 'erro temporário'
        }. Nova tentativa em ${delay}ms.`
      );

      await sleep(delay);
    }
  }

  throw (
    lastError ||
    new Error(
      'Gemini indisponível'
    )
  );
}

// ============================================================
// EXTRACT TEXT
// ============================================================

function extractText(
  data: InteractionResponse
): string {
  const steps =
    Array.isArray(data.steps)
      ? data.steps
      : [];

  const modelOutputs =
    steps.filter(
      (step) =>
        step.type ===
        'model_output'
    );

  const lastOutput =
    modelOutputs[
      modelOutputs.length - 1
    ];

  if (!lastOutput) {
    throw new Error(
      `Gemini não retornou model_output. Status: ${
        data.status || 'desconhecido'
      }`
    );
  }

  const blocks =
    Array.isArray(
      lastOutput.content
    )
      ? lastOutput.content
      : [];

  const text =
    blocks
      .filter(
        (block) =>
          block.type ===
            'text' &&
          typeof block.text ===
            'string'
      )
      .map(
        (block) =>
          block.text || ''
      )
      .join('\n')
      .trim();

  if (!text) {
    throw new Error(
      'Gemini retornou resposta sem texto'
    );
  }

  return text;
}

// ============================================================
// NORMAL GEMINI QUERY
// ============================================================

async function callGemini(
  prompt: string
): Promise<string> {
  const data =
    await callInteraction(
      {
        model:
          GEMINI_MODEL,

        input:
          prompt,

        system_instruction:
          'Responda de forma objetiva e imparcial. ' +
          'Não invente empresas, marcas, produtos ou informações. ' +
          'Se não tiver informação suficiente, deixe isso claro.',
      },

      'Gemini API'
    );

  return extractText(
    data
  );
}

// ============================================================
// STRUCTURED EVALUATION
// ============================================================

async function evaluateResponse(
  input: AIAnalysisInput,
  prompt: string,
  responseText: string
): Promise<RawEvaluation> {
  const companyReference =
    input.company_name ||
    input.query ||
    input.website ||
    '';

  const competitors =
    input.competitors &&
    input.competitors.length > 0
      ? input.competitors.join(
          ', '
        )
      : 'não informados';

  const evaluationPrompt = `
Você é um avaliador rigoroso de visibilidade de marcas.

Marca analisada:
"${companyReference}"

Concorrentes:
"${competitors}"

Pergunta feita ao Gemini:
"${prompt}"

Resposta do Gemini:
"""
${responseText}
"""

Avalie de 0 a 100:

presence:
100 = marca aparece claramente.
0 = marca não aparece.

recommendation:
100 = recomendação explícita.
0 = não é recomendada.

position:
100 = primeira opção.
0 = não aparece.

relevance:
100 = totalmente relevante.
0 = irrelevante.

competitive_share:
100 = domina a resposta.
50 = divide atenção igualmente.
0 = não aparece.

IMPORTANTE:

Se a empresa não aparece:
presence = 0
recommendation = 0
position = 0
competitive_share = 0

Use exclusivamente as evidências presentes na resposta.
`;

  const data =
    await callInteraction(
      {
        model:
          GEMINI_MODEL,

        input:
          evaluationPrompt,

        system_instruction:
          'Avalie somente as evidências fornecidas. ' +
          'Não invente informações.',

        response_format: {
          type: 'text',

          mime_type:
            'application/json',

          schema:
            EVALUATION_SCHEMA,
        },
      },

      'Gemini evaluation'
    );

  const content =
    extractText(
      data
    );

  let parsed:
    Record<string, unknown>;

  try {
    parsed =
      JSON.parse(content);
  } catch {
    throw new Error(
      `Gemini retornou JSON inválido: ${content.slice(
        0,
        300
      )}`
    );
  }

  return {
    presence:
      clamp(
        Number(
          parsed.presence
        ) || 0
      ),

    recommendation:
      clamp(
        Number(
          parsed.recommendation
        ) || 0
      ),

    position:
      clamp(
        Number(
          parsed.position
        ) || 0
      ),

    relevance:
      clamp(
        Number(
          parsed.relevance
        ) || 0
      ),

    competitive_share:
      clamp(
        Number(
          parsed
            .competitive_share
        ) || 0
      ),
  };
}

// ============================================================
// CONSISTENCY
// ============================================================

function calculateConsistency(
  observations:
    AIObservation[]
): number {
  if (
    observations.length <= 1
  ) {
    return 100;
  }

  const scores =
    observations.map(
      (observation) =>
        observation.presence *
          0.25 +
        observation.recommendation *
          0.25 +
        observation.position *
          0.20 +
        observation.relevance *
          0.15 +
        observation
          .competitive_share *
          0.15
    );

  const mean =
    average(scores);

  const variance =
    scores.reduce(
      (sum, score) =>
        sum +
        Math.pow(
          score - mean,
          2
        ),
      0
    ) /
    scores.length;

  const deviation =
    Math.sqrt(
      variance
    );

  return clamp(
    100 -
      deviation * 2
  );
}

// ============================================================
// EMPTY RESULT
// ============================================================

function emptyDimensions():
  AIVisibilityDimensions {
  return {
    presence: 0,
    recommendation: 0,
    position: 0,
    relevance: 0,
    competitive_share: 0,
    consistency: 0,
  };
}

function emptyResult(
  error: string
): AIProviderResult {
  return {
    provider:
      'gemini',

    model:
      GEMINI_MODEL,

    score: 0,

    dimensions:
      emptyDimensions(),

    observations: [],

    observations_count: 0,

    success: false,

    error,
  };
}

// ============================================================
// MAIN
// ============================================================

export async function analyzeWithGemini(
  input: AIAnalysisInput
): Promise<AIProviderResult> {
  try {
    if (!GEMINI_API_KEY) {
      return emptyResult(
        'GEMINI_API_KEY não configurada'
      );
    }

    const prompts =
      buildPrompts(
        input
      );

    const observations:
      AIObservation[] = [];

    for (
      const prompt of prompts
    ) {
      const responseText =
        await callGemini(
          prompt
        );

      const evaluation =
        await evaluateResponse(
          input,
          prompt,
          responseText
        );

      observations.push({
        provider:
          'gemini',

        model:
          GEMINI_MODEL,

        prompt,

        response:
          responseText,

        presence:
          evaluation.presence,

        recommendation:
          evaluation
            .recommendation,

        position:
          evaluation.position,

        relevance:
          evaluation.relevance,

        competitive_share:
          evaluation
            .competitive_share,

        consistency: 0,
      });
    }

    if (
      observations.length === 0
    ) {
      return emptyResult(
        'Nenhuma observação Gemini concluída'
      );
    }

    const consistency =
      calculateConsistency(
        observations
      );

    observations.forEach(
      (observation) => {
        observation.consistency =
          consistency;
      }
    );

    const dimensions:
      AIVisibilityDimensions = {
      presence:
        average(
          observations.map(
            (item) =>
              item.presence
          )
        ),

      recommendation:
        average(
          observations.map(
            (item) =>
              item.recommendation
          )
        ),

      position:
        average(
          observations.map(
            (item) =>
              item.position
          )
        ),

      relevance:
        average(
          observations.map(
            (item) =>
              item.relevance
          )
        ),

      competitive_share:
        average(
          observations.map(
            (item) =>
              item
                .competitive_share
          )
        ),

      consistency,
    };

    const score =
      calculateScore(
        dimensions
      );

    return {
      provider:
        'gemini',

      model:
        GEMINI_MODEL,

      score:
        round1(score),

      dimensions: {
        presence:
          round1(
            dimensions.presence
          ),

        recommendation:
          round1(
            dimensions
              .recommendation
          ),

        position:
          round1(
            dimensions.position
          ),

        relevance:
          round1(
            dimensions.relevance
          ),

        competitive_share:
          round1(
            dimensions
              .competitive_share
          ),

        consistency:
          round1(
            consistency
          ),
      },

      observations,

      observations_count:
        observations.length,

      success: true,
    };
  } catch (error) {
    console.error(
      '[Gemini Provider]',
      error
    );

    return emptyResult(
      error instanceof Error
        ? error.message
        : 'Erro desconhecido no provider Gemini'
    );
  }
}