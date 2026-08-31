import {
  AIAnalysisInput,
  AIObservation,
  AIProviderResult,
  AIVisibilityDimensions,
} from './types';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Se quiser trocar o modelo depois, basta adicionar ANTHROPIC_MODEL no .env.local/Vercel.
const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

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

  return (
    values.reduce((sum, value) => sum + value, 0) /
    values.length
  );
}

function calculateScore(
  dimensions: AIVisibilityDimensions
) {
  return (
    dimensions.presence * 0.25 +
    dimensions.recommendation * 0.25 +
    dimensions.position * 0.2 +
    dimensions.relevance * 0.15 +
    dimensions.competitive_share * 0.1 +
    dimensions.consistency * 0.05
  );
}

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

async function callAnthropic(
  prompt: string
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY não configurada'
    );
  }

  const response = await fetch(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',

      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },

      body: JSON.stringify({
        model: ANTHROPIC_MODEL,

        max_tokens: 1200,

        temperature: 0.2,

        system:
          'Responda de forma objetiva. Não invente empresas ou informações que você não reconheça.',

        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Anthropic API error ${response.status}: ${
        errorText || 'erro desconhecido'
      }`
    );
  }

  const data = await response.json();

  const textBlocks = Array.isArray(data?.content)
    ? data.content.filter(
        (item: any) => item?.type === 'text'
      )
    : [];

  return textBlocks
    .map((item: any) => item.text || '')
    .join('\n')
    .trim();
}

function extractJSON(text: string) {
  const cleaned = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  if (start === -1 || end === -1) {
    throw new Error(
      'Claude não retornou JSON válido'
    );
  }

  return cleaned.slice(start, end + 1);
}

async function evaluateResponse(
  input: AIAnalysisInput,
  prompt: string,
  responseText: string
): Promise<RawEvaluation> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY não configurada'
    );
  }

  const companyReference =
    input.company_name ||
    input.query ||
    input.website ||
    '';

  const competitors =
    input.competitors &&
    input.competitors.length > 0
      ? input.competitors.join(', ')
      : 'não informados';

  const evaluationPrompt = `
Você é um avaliador rigoroso de visibilidade de marcas em respostas de inteligência artificial.

Analise a resposta abaixo.

Marca/empresa analisada:
"${companyReference}"

Concorrentes conhecidos:
"${competitors}"

Prompt original:
"${prompt}"

Resposta:
"""
${responseText}
"""

Avalie de 0 a 100:

presence:
100 = empresa aparece claramente
60-90 = aparece parcialmente/contextualmente
0 = não aparece

recommendation:
100 = recomendação explícita
70-90 = apresentação positiva
30-60 = apenas mencionada
0 = não recomendada

position:
100 = primeira opção
80-90 = posição alta
40-70 = posição intermediária
10-30 = posição baixa
0 = não aparece

relevance:
100 = completamente relevante
70-90 = bastante relevante
30-60 = parcialmente relevante
0 = irrelevante

competitive_share:
100 = domina a resposta
50 = divide atenção aproximadamente igualmente
0 = não aparece

Retorne SOMENTE JSON válido.

Formato obrigatório:

{
  "presence": 0,
  "recommendation": 0,
  "position": 0,
  "relevance": 0,
  "competitive_share": 0
}
`;

  const response = await fetch(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',

      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },

      body: JSON.stringify({
        model: ANTHROPIC_MODEL,

        max_tokens: 500,

        temperature: 0,

        system:
          'Você é um avaliador rigoroso. Retorne somente JSON válido, sem markdown.',

        messages: [
          {
            role: 'user',
            content: evaluationPrompt,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Anthropic evaluation error ${
        response.status
      }: ${errorText || 'erro desconhecido'}`
    );
  }

  const data = await response.json();

  const textBlocks = Array.isArray(data?.content)
    ? data.content.filter(
        (item: any) => item?.type === 'text'
      )
    : [];

  const content = textBlocks
    .map((item: any) => item.text || '')
    .join('\n')
    .trim();

  const parsed = JSON.parse(
    extractJSON(content)
  );

  return {
    presence: clamp(
      Number(parsed.presence) || 0
    ),

    recommendation: clamp(
      Number(parsed.recommendation) || 0
    ),

    position: clamp(
      Number(parsed.position) || 0
    ),

    relevance: clamp(
      Number(parsed.relevance) || 0
    ),

    competitive_share: clamp(
      Number(parsed.competitive_share) || 0
    ),
  };
}

function calculateConsistency(
  observations: AIObservation[]
) {
  if (observations.length <= 1) {
    return 100;
  }

  const scores = observations.map(
    (observation) =>
      observation.presence * 0.25 +
      observation.recommendation * 0.25 +
      observation.position * 0.2 +
      observation.relevance * 0.15 +
      observation.competitive_share * 0.15
  );

  const mean = average(scores);

  const variance =
    scores.reduce((sum, score) => {
      return (
        sum + Math.pow(score - mean, 2)
      );
    }, 0) / scores.length;

  const standardDeviation =
    Math.sqrt(variance);

  return clamp(
    100 - standardDeviation * 2
  );
}

function emptyResult(
  error: string
): AIProviderResult {
  return {
    provider: 'anthropic',

    model: ANTHROPIC_MODEL,

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

    error,
  };
}

export async function analyzeWithAnthropic(
  input: AIAnalysisInput
): Promise<AIProviderResult> {
  try {
    if (!ANTHROPIC_API_KEY) {
      return emptyResult(
        'ANTHROPIC_API_KEY não configurada'
      );
    }

    const prompts =
      buildPrompts(input);

    const observations: AIObservation[] =
      [];

    /*
      Mantemos execução sequencial por enquanto
      para evitar rate limits durante o MVP.
    */

    for (const prompt of prompts) {
      const responseText =
        await callAnthropic(prompt);

      const evaluation =
        await evaluateResponse(
          input,
          prompt,
          responseText
        );

      observations.push({
        provider: 'anthropic',

        model: ANTHROPIC_MODEL,

        prompt,

        response: responseText,

        presence:
          evaluation.presence,

        recommendation:
          evaluation.recommendation,

        position:
          evaluation.position,

        relevance:
          evaluation.relevance,

        competitive_share:
          evaluation.competitive_share,

        consistency: 0,
      });
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

    const dimensions: AIVisibilityDimensions =
      {
        presence: average(
          observations.map(
            (item) => item.presence
          )
        ),

        recommendation: average(
          observations.map(
            (item) =>
              item.recommendation
          )
        ),

        position: average(
          observations.map(
            (item) => item.position
          )
        ),

        relevance: average(
          observations.map(
            (item) => item.relevance
          )
        ),

        competitive_share: average(
          observations.map(
            (item) =>
              item.competitive_share
          )
        ),

        consistency,
      };

    const score =
      calculateScore(dimensions);

    return {
      provider: 'anthropic',

      model: ANTHROPIC_MODEL,

      score:
        Math.round(score * 10) / 10,

      dimensions: {
        presence:
          Math.round(
            dimensions.presence * 10
          ) / 10,

        recommendation:
          Math.round(
            dimensions.recommendation *
              10
          ) / 10,

        position:
          Math.round(
            dimensions.position * 10
          ) / 10,

        relevance:
          Math.round(
            dimensions.relevance * 10
          ) / 10,

        competitive_share:
          Math.round(
            dimensions.competitive_share *
              10
          ) / 10,

        consistency:
          Math.round(
            consistency * 10
          ) / 10,
      },

      observations,

      observations_count:
        observations.length,

      success: true,
    };
  } catch (error) {
    return emptyResult(
      error instanceof Error
        ? error.message
        : 'Erro desconhecido no provider Anthropic'
    );
  }
}