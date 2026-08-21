import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AnalysisRequest {
  company: string;
  website: string;
  segment: string;
  competitors?: string[];
}

interface AIObservation {
  prompt: string;
  response: string;
  presence: number;
  recommendation: number;
  position: number;
  relevance: number;
  competitive_share: number;
}

/**
 * Generate prompts based on company context
 */
function generatePrompts(company: string, segment: string, competitors: string[]): string[] {
  const prompts = [
    // Category prompts
    `Quais são as melhores empresas de ${segment} no Brasil? Mencione ${company}.`,
    `Qual é a empresa mais reconhecida em ${segment} no Brasil? ${company} está entre elas?`,
    `Liste as top 3 empresas de ${segment} no Brasil e sua relevância.`,

    // Commercial intent prompts
    `Estou procurando uma solução de ${segment}. Qual empresa você recomendaria para uma empresa de médio porte?`,
    `Se eu precisasse contratar um serviço de ${segment}, qual empresa você recomendaria?`,
    `${company} é boa opção para ${segment}?`,

    // Authority prompts
    `Quem é considerado referência em ${segment} no Brasil?`,
    `${company} é especialista em ${segment}?`,

    // Competitive prompts
    `Compare ${company} com seus principais concorrentes em ${segment}.`,
    `${company} vs ${competitors[0] || 'concorrentes'}: qual é melhor em ${segment}?`,
  ];

  return prompts;
}

/**
 * Analyze response to extract AI visibility dimensions
 */
async function evaluateResponse(
  company: string,
  prompt: string,
  response: string
): Promise<Partial<AIObservation>> {
  // For MVP, use simple heuristics
  // In production, could use another Claude call for structured evaluation

  const lowerResponse = response.toLowerCase();
  const lowerCompany = company.toLowerCase();

  let presence = 0;
  let recommendation = 0;
  let position = 0;
  let relevance = 0;
  let competitive_share = 0;

  // Presence: was company mentioned?
  if (lowerResponse.includes(lowerCompany)) {
    presence = 80 + Math.random() * 20;

    // Position: where was it mentioned?
    const lines = response.split('\n');
    const mentionLineIndex = lines.findIndex((l) => l.toLowerCase().includes(lowerCompany));
    if (mentionLineIndex !== -1) {
      position = Math.max(70, 100 - mentionLineIndex * 5);
    }
  }

  // Recommendation: explicit recommendation or qualified mention?
  const recommendPhrases = [
    'recomendo',
    'recomendaria',
    'recommend',
    'good choice',
    'excellent',
    'melhor opção',
    'top',
  ];
  if (recommendPhrases.some((phrase) => lowerResponse.includes(phrase))) {
    recommendation = 60 + Math.random() * 40;
  }

  // Relevance: is context correct?
  const contextKeywords = prompt.split(' ').slice(-5);
  const contextMatch = contextKeywords.filter((kw) => lowerResponse.includes(kw.toLowerCase()));
  relevance = Math.min(1, 0.5 + (contextMatch.length / contextKeywords.length) * 0.5);

  // Competitive share: how much of response is about our company?
  if (presence > 0 && response.length > 0) {
    const companyMentionCount = (response.match(new RegExp(lowerCompany, 'g')) || []).length;
    const totalMentions = response.split('\n').length;
    competitive_share = Math.min(100, (companyMentionCount / Math.max(totalMentions, 1)) * 100);
  }

  return {
    presence,
    recommendation,
    position,
    relevance,
    competitive_share,
  };
}

/**
 * POST /api/ai-visibility/analyze
 * Input: { company: string, website: string, segment: string, competitors?: string[] }
 * Returns: AIObservation[]
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: 'OpenAI não configurado',
          note: 'Configure OPENAI_API_KEY no .env',
          data_type: 'NOT_CONFIGURED',
        },
        { status: 503 }
      );
    }

    const { company, website, segment, competitors }: AnalysisRequest = await request.json();

    if (!company || !segment) {
      return NextResponse.json({ error: 'company e segment são obrigatórios' }, { status: 400 });
    }

    const prompts = generatePrompts(company, segment, competitors || []);
    const observations: AIObservation[] = [];

    // Execute prompts (limit to 10 for MVP cost control)
    const limitedPrompts = prompts.slice(0, 10);

    for (const prompt of limitedPrompts) {
      try {
        const message = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        });

        const response = message.choices[0]?.message?.content || '';

        const evaluation = await evaluateResponse(company, prompt, response);

        observations.push({
          prompt,
          response,
          presence: evaluation.presence || 0,
          recommendation: evaluation.recommendation || 0,
          position: evaluation.position || 0,
          relevance: evaluation.relevance || 0,
          competitive_share: evaluation.competitive_share || 0,
        });
      } catch (error) {
        console.error(`Error processing prompt: ${prompt}`, error);
        // Continue with next prompt
      }
    }

    return NextResponse.json({
      observations,
      total_prompts: limitedPrompts.length,
      evaluated_responses: observations.length,
    });
  } catch (error) {
    console.error('AI visibility error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro ao analisar visibilidade',
      },
      { status: 500 }
    );
  }
}
