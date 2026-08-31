import {
  AIAnalysisInput,
  AIObservation,
  AIProviderResult,
  AIVisibilityDimensions,
} from './types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const OPENAI_MODEL = 'gpt-4o-mini';

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

  const segment = input.segment || input.query || 'mercado relacionado';

  const location = input.location || input.country || 'Brasil';

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

async function callOpenAI(prompt: string) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY não configurada');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI API error ${response.status}: ${errorText || 'erro desconhecido'}`
    );
  }

  const data = await response.json();

  return (
    data?.choices?.[0]?.message?.content?.trim() ||
    ''
  );
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
Você é um avaliador de visibilidade de marcas em respostas de IA.

Analise a resposta abaixo e retorne SOMENTE JSON válido.

Marca/empresa analisada:
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
- 100 se a empresa aparece claramente e de forma direta
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
- estime o share de atenção da empresa em relação aos concorrentes citados
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

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI evaluation error ${response.status}: ${
        errorText || 'erro desconhecido'
      }`
    );
  }

  const data = await response.json();

  const content =
    data?.choices?.[0]?.message?.content || '{}';

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

    const observations: AIObservation[] = [];

    for (const prompt of prompts) {
      const responseText = await callOpenAI(prompt);

      const evaluation = await evaluateResponse(
        input,
        prompt,
        responseText
      );

      observations.push({
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
      });
    }

    const consistency = calculateConsistency(observations);

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
        presence: Math.round(dimensions.presence * 10) / 10,
        recommendation:
          Math.round(dimensions.recommendation * 10) / 10,
        position: Math.round(dimensions.position * 10) / 10,
        relevance: Math.round(dimensions.relevance * 10) / 10,
        competitive_share:
          Math.round(dimensions.competitive_share * 10) / 10,
        consistency: Math.round(consistency * 10) / 10,
      },
      observations,
      observations_count: observations.length,
      success: true,
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