import {
  AIAnalysisInput,
  AIObservation,
  AIProviderResult,
  AIVisibilityDimensions,
} from './types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const OPENAI_MODEL = 'gpt-4o-mini';

const PROMPT_CONCURRENCY = 4;
const OPENAI_CALL_TIMEOUT_MS = 15000;

type RawEvaluation = {
  presence: number;
  recommendation: number;
  position: number;
  relevance: number;
  competitive_share: number;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateScore(dimensions: AIVisibilityDimensions) {
  return (
    dimensions.presence * 0.25 +
    dimensions.recommendation * 0.25 +
    dimensions.position * 0.2 +
    dimensions.relevance * 0.15 +
    dimensions.competitive_share * 0.1 +
    dimensions.consistency * 0.05
  );
}

function buildPrompts(input: AIAnalysisInput): string[] {
  const subject =
    input.company_name ||
    input.query ||
    input.website ||
    input.segment ||
    'empresa analisada';

  const location =
    input.location ||
    input.country ||
    'Brasil';

  return [
    `O que é ${subject} e em que contexto ele é mais conhecido em ${location}?`,
    `Se alguém perguntasse por ${subject}, quais alternativas ou concorrentes relevantes também deveriam ser considerados?`,
    `Você recomendaria ${subject}? Explique em quais situações ele seria uma boa opção.`,
    `Quais são os principais pontos fortes de ${subject} em comparação com alternativas conhecidas?`,
    `Quais marcas, empresas ou produtos costumam ser mencionados junto com ${subject}?`,
    `Quando alguém procura uma solução semelhante a ${subject}, quais opções costumam aparecer primeiro?`,
    `Compare ${subject} com alternativas relevantes e indique em quais critérios ele se destaca ou fica atrás.`,
    `Em uma lista de recomendações relacionadas a ${subject}, ele provavelmente apareceria entre as primeiras opções? Explique.`,
  ];
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
) {
  const controller = new AbortController();

  const timeoutId = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callOpenAI(prompt: string) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY não configurada');
  }

  const response = await fetchWithTimeout(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'Responda de forma objetiva. Não invente empresas ou informações que você não reconheça.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    },
    OPENAI_CALL_TIMEOUT_MS
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `OpenAI API error ${response.status}: ${
        errorText || 'erro desconhecido'
      }`
    );
  }

  const data = await response.json();

  return data?.choices?.[0]?.message?.content?.trim() || '';
}

async function evaluateResponse(
  input: AIAnalysisInput,
  prompt: string,
  responseText: string
): Promise<RawEvaluation> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY não configurada');
  }

  const companyReference =
    input.company_name ||
    input.query ||
    input.website ||
    '';

  const competitors =
    input.competitors && input.competitors.length > 0
      ? input.competitors.join(', ')
      : 'não informados';

  const evaluationPrompt = `
Você é um avaliador de visibilidade de marcas, empresas, produtos e serviços em respostas de IA.

Analise a resposta abaixo e retorne SOMENTE JSON válido.

Entidade analisada:
"${companyReference}"

Concorrentes conhecidos:
"${competitors}"

Prompt original:
"${prompt}"

Resposta da IA:
"""
${responseText}
"""

Avalie estas dimensões de 0 a 100:

presence:
- 100 se a entidade aparece claramente e de forma direta
- 60 a 90 se aparece parcialmente ou com contexto relacionado
- 0 se não aparece

recommendation:
- 100 se é recomendada explicitamente
- 70 a 90 se é apresentada de forma positiva
- 30 a 60 se apenas mencionada
- 0 se não recomendada

position:
- 100 se aparece entre as primeiras opções
- 80 se aparece em posição alta
- 50 se aparece no meio
- 20 se aparece no fim
- 0 se não aparece

relevance:
- 100 se a menção é totalmente relevante ao contexto
- 70 se parcialmente relevante
- 30 se tangencial
- 0 se irrelevante

competitive_share:
- estime o share de atenção da entidade em relação aos concorrentes citados
- 100 se domina a resposta
- 50 se divide igualmente
- 0 se não aparece

Retorne exatamente:

{
  "presence": number,
  "recommendation": number,
  "position": number,
  "relevance": number,
  "competitive_share": number
}
`;

  const response = await fetchWithTimeout(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0,
        response_format: {
          type: 'json_object',
        },
        messages: [
          {
            role: 'system',
            content:
              'Você é um avaliador rigoroso. Retorne apenas JSON válido.',
          },
          {
            role: 'user',
            content: evaluationPrompt,
          },
        ],
      }),
    },
    OPENAI_CALL_TIMEOUT_MS
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `OpenAI evaluation error ${response.status}: ${
        errorText || 'erro desconhecido'
      }`
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(content);

  return {
    presence: clamp(Number(parsed.presence) || 0),
    recommendation: clamp(Number(parsed.recommendation) || 0),
    position: clamp(Number(parsed.position) || 0),
    relevance: clamp(Number(parsed.relevance) || 0),
    competitive_share: clamp(
      Number(parsed.competitive_share) || 0
    ),
  };
}

async function analyzePrompt(
  input: AIAnalysisInput,
  prompt: string
): Promise<AIObservation> {
  const responseText = await callOpenAI(prompt);

  const evaluation = await evaluateResponse(
    input,
    prompt,
    responseText
  );

  return {
    provider: 'openai',
    model: OPENAI_MODEL,
    prompt,
    response: responseText,
    presence: evaluation.presence,
    recommendation: evaluation.recommendation,
    position: evaluation.position,
    relevance: evaluation.relevance,
    competitive_share: evaluation.competitive_share,
    consistency: 0,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] =
    new Array(items.length);

  let nextIndex = 0;

  async function runner() {
    while (true) {
      const index = nextIndex++;

      if (index >= items.length) {
        return;
      }

      try {
        const value = await worker(items[index], index);

        results[index] = {
          status: 'fulfilled',
          value,
        };
      } catch (reason) {
        results[index] = {
          status: 'rejected',
          reason,
        };
      }
    }
  }

  const runners = Array.from(
    {
      length: Math.min(concurrency, items.length),
    },
    () => runner()
  );

  await Promise.all(runners);

  return results;
}

function calculateConsistency(observations: AIObservation[]) {
  if (observations.length <= 1) return 100;

  const scores = observations.map((observation) => {
    return (
      observation.presence * 0.25 +
      observation.recommendation * 0.25 +
      observation.position * 0.2 +
      observation.relevance * 0.15 +
      observation.competitive_share * 0.15
    );
  });

  const mean = average(scores);

  const variance =
    scores.reduce((sum, score) => {
      return sum + Math.pow(score - mean, 2);
    }, 0) / scores.length;

  const standardDeviation = Math.sqrt(variance);

  return clamp(100 - standardDeviation * 2);
}

export async function analyzeWithOpenAI(
  input: AIAnalysisInput
): Promise<AIProviderResult> {
  try {
    if (!OPENAI_API_KEY) {
      return {
        provider: 'openai',
        model: OPENAI_MODEL,
        score: 0,
        dimensions: {
          presence: 0,
          recommendation: 0,
          position: 0,
          relevance: 0,
          competitive_share: 0,
          consistency: 0,
        },
        observations: [],
        observations_count: 0,
        success: false,
        error: 'OPENAI_API_KEY não configurada',
      };
    }

    const prompts = buildPrompts(input);

    const settledObservations = await mapWithConcurrency(
      prompts,
      PROMPT_CONCURRENCY,
      (prompt) => analyzePrompt(input, prompt)
    );

    const observations = settledObservations
      .filter(
        (
          result
        ): result is PromiseFulfilledResult<AIObservation> =>
          result.status === 'fulfilled'
      )
      .map((result) => result.value);

    const failures = settledObservations.filter(
      (result) => result.status === 'rejected'
    );

    if (observations.length === 0) {
      const firstFailure = failures[0];

      const errorMessage =
        firstFailure &&
        firstFailure.status === 'rejected'
          ? firstFailure.reason instanceof Error
            ? firstFailure.reason.message
            : String(firstFailure.reason)
          : 'Nenhuma observação OpenAI foi concluída.';

      throw new Error(errorMessage);
    }

    const consistency =
      calculateConsistency(observations);

    observations.forEach((observation) => {
      observation.consistency = consistency;
    });

    const dimensions: AIVisibilityDimensions = {
      presence: average(
        observations.map((item) => item.presence)
      ),
      recommendation: average(
        observations.map((item) => item.recommendation)
      ),
      position: average(
        observations.map((item) => item.position)
      ),
      relevance: average(
        observations.map((item) => item.relevance)
      ),
      competitive_share: average(
        observations.map((item) => item.competitive_share)
      ),
      consistency,
    };

    const score = calculateScore(dimensions);

    return {
      provider: 'openai',
      model: OPENAI_MODEL,
      score: Math.round(score * 10) / 10,
      dimensions: {
        presence:
          Math.round(dimensions.presence * 10) / 10,
        recommendation:
          Math.round(dimensions.recommendation * 10) / 10,
        position:
          Math.round(dimensions.position * 10) / 10,
        relevance:
          Math.round(dimensions.relevance * 10) / 10,
        competitive_share:
          Math.round(dimensions.competitive_share * 10) / 10,
        consistency:
          Math.round(consistency * 10) / 10,
      },
      observations,
      observations_count: observations.length,
      success: true,
      error:
        failures.length > 0
          ? `${failures.length} de ${prompts.length} prompts não concluíram.`
          : undefined,
    };
  } catch (error) {
    return {
      provider: 'openai',
      model: OPENAI_MODEL,
      score: 0,
      dimensions: {
        presence: 0,
        recommendation: 0,
        position: 0,
        relevance: 0,
        competitive_share: 0,
        consistency: 0,
      },
      observations: [],
      observations_count: 0,
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Erro desconhecido no provider OpenAI',
    };
  }
}
