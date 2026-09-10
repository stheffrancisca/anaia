import {
  NextRequest,
  NextResponse,
} from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 35;

const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY;

const OPENAI_MODEL =
  'gpt-4o-mini';

const MAX_COMPETITORS = 3;
const RESOLUTION_TIMEOUT_MS = 12000;
const DISCOVERY_TIMEOUT_MS = 14000;

type EntityType =
  | 'company'
  | 'brand'
  | 'product'
  | 'service'
  | 'category'
  | 'unknown';

type ConfidenceLevel =
  | 'high'
  | 'medium'
  | 'low';

type EntityUnderstanding = {
  intent: EntityType;
  entity_name: string;
  company_name: string | null;
  product_name: string | null;
  website: string | null;
  segment: string | null;
  category: string | null;
  problem_solved: string | null;
  target_audience: string | null;
  location: string | null;
  description: string | null;
  confidence: ConfidenceLevel;
  recognized: boolean;
};

type CompetitorCandidate = {
  name: string;
  entity_type: EntityType;
  why_similar: string;
  similarities: string[];
  same_category: boolean;
  same_problem: boolean;
  same_audience: boolean;
  direct_competitor: boolean;
};

type ResolvedQuery = {
  original_query: string;
  intent: EntityType;
  entity_name: string;
  company_name: string | null;
  product_name: string | null;
  website: string | null;
  segment: string | null;
  category: string | null;
  problem_solved: string | null;
  target_audience: string | null;
  location: string | null;
  description: string | null;
  competitors: CompetitorCandidate[];
  confidence: ConfidenceLevel;
  recognized: boolean;
  data_sources: string[];
};

function cleanString(
  value: unknown
): string | null {
  return typeof value === 'string' &&
    value.trim()
    ? value.trim()
    : null;
}

function normalizeEntityType(
  value: unknown
): EntityType {
  const normalized =
    String(value || '')
      .trim()
      .toLowerCase();

  if (
    [
      'company',
      'brand',
      'product',
      'service',
      'category',
    ].includes(normalized)
  ) {
    return normalized as EntityType;
  }

  return 'unknown';
}

function normalizeConfidence(
  value: unknown
): ConfidenceLevel {
  const normalized =
    String(value || '')
      .trim()
      .toLowerCase();

  if (
    normalized === 'high' ||
    normalized === 'medium' ||
    normalized === 'low'
  ) {
    return normalized;
  }

  return 'low';
}

function cleanStringArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (
        item
      ): item is string =>
        typeof item === 'string'
    )
    .map((item) =>
      item.trim()
    )
    .filter(Boolean)
    .slice(0, 5);
}

function booleanValue(
  value: unknown
): boolean {
  return value === true;
}

function getFirstPartyContext(
  query: string
): Partial<EntityUnderstanding> | null {
  const normalized =
    query
      .trim()
      .toLowerCase();

  /*
   * Isto NÃO define concorrentes manualmente.
   *
   * É apenas contexto first-party do próprio produto ANAIA,
   * necessário porque um modelo externo pode não reconhecer
   * corretamente uma empresa/produto novo apenas pelo nome.
   */
  if (
    normalized === 'anaia' ||
    normalized === 'apareça na ia' ||
    normalized === 'apareca na ia'
  ) {
    return {
      intent: 'company',
      entity_name: 'ANAIA',
      company_name: 'ANAIA',
      product_name: null,
      website: 'aparecanaia.com.br',
      segment:
        'AI Visibility / GEO / AI Search Analytics',
      category:
        'plataforma de monitoramento de visibilidade em inteligências artificiais',
      problem_solved:
        'medir como marcas e empresas aparecem, são recomendadas e competem em respostas de inteligências artificiais',
      target_audience:
        'empresas, marketing, SEO, estratégia e inteligência competitiva',
      location:
        'Brasil',
      description:
        'Plataforma de inteligência de visibilidade em IA para monitorar presença, recomendação e posição competitiva de marcas.',
      confidence:
        'high',
      recognized:
        true,
    };
  }

  return null;
}

async function fetchJsonFromOpenAI(
  messages: Array<{
    role:
      | 'system'
      | 'user';
    content: string;
  }>,
  timeoutMs: number
): Promise<any> {
  if (!OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY não configurada'
    );
  }

  const controller =
    new AbortController();

  const timeoutId =
    setTimeout(
      () =>
        controller.abort(),
      timeoutMs
    );

  try {
    const response =
      await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',

          headers: {
            Authorization:
              `Bearer ${OPENAI_API_KEY}`,

            'Content-Type':
              'application/json',
          },

          signal:
            controller.signal,

          body:
            JSON.stringify({
              model:
                OPENAI_MODEL,

              temperature:
                0,

              response_format: {
                type:
                  'json_object',
              },

              messages,
            }),
        }
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        `OpenAI ${response.status}: ${
          errorText ||
          'erro desconhecido'
        }`
      );
    }

    const data =
      await response.json();

    const content =
      data?.choices?.[0]
        ?.message?.content ||
      '{}';

    return JSON.parse(
      content
    );
  } finally {
    clearTimeout(
      timeoutId
    );
  }
}

async function understandEntity(
  query: string
): Promise<EntityUnderstanding> {
  const firstParty =
    getFirstPartyContext(
      query
    );

  if (firstParty) {
    return {
      intent:
        firstParty.intent ||
        'unknown',

      entity_name:
        firstParty.entity_name ||
        query,

      company_name:
        firstParty.company_name ||
        null,

      product_name:
        firstParty.product_name ||
        null,

      website:
        firstParty.website ||
        null,

      segment:
        firstParty.segment ||
        null,

      category:
        firstParty.category ||
        null,

      problem_solved:
        firstParty.problem_solved ||
        null,

      target_audience:
        firstParty.target_audience ||
        null,

      location:
        firstParty.location ||
        null,

      description:
        firstParty.description ||
        null,

      confidence:
        firstParty.confidence ||
        'high',

      recognized:
        firstParty.recognized ??
        true,
    };
  }

  const resolved =
    await fetchJsonFromOpenAI(
      [
        {
          role:
            'system',

          content:
            `Você é o motor de entendimento de entidades do ANAIA.

Sua tarefa nesta etapa é SOMENTE entender o que foi pesquisado.

REGRAS:
- Não descubra concorrentes ainda.
- Não invente fatos.
- Se não reconhecer a entidade com segurança, use recognized=false.
- Se estiver incerto sobre categoria, segmento, público ou problema resolvido, retorne null.
- Diferencie empresa, marca, produto, serviço e categoria.
- Seja conservador.
- Retorne apenas JSON válido.`,
        },
        {
          role:
            'user',

          content:
            `Analise esta pesquisa:

"${query}"

Retorne exatamente:

{
  "intent": "company | brand | product | service | category | unknown",
  "entity_name": "nome principal identificado",
  "company_name": "empresa associada ou null",
  "product_name": "produto associado ou null",
  "website": "website conhecido ou null",
  "segment": "segmento específico ou null",
  "category": "categoria específica ou null",
  "problem_solved": "principal problema resolvido ou null",
  "target_audience": "público principal ou null",
  "location": "mercado ou país principal quando relevante ou null",
  "description": "descrição curta e factual ou null",
  "confidence": "high | medium | low",
  "recognized": true
}`,
        },
      ],
      RESOLUTION_TIMEOUT_MS
    );

  return {
    intent:
      normalizeEntityType(
        resolved?.intent
      ),

    entity_name:
      cleanString(
        resolved
          ?.entity_name
      ) || query,

    company_name:
      cleanString(
        resolved
          ?.company_name
      ),

    product_name:
      cleanString(
        resolved
          ?.product_name
      ),

    website:
      cleanString(
        resolved?.website
      ),

    segment:
      cleanString(
        resolved?.segment
      ),

    category:
      cleanString(
        resolved?.category
      ),

    problem_solved:
      cleanString(
        resolved
          ?.problem_solved
      ),

    target_audience:
      cleanString(
        resolved
          ?.target_audience
      ),

    location:
      cleanString(
        resolved?.location
      ),

    description:
      cleanString(
        resolved
          ?.description
      ),

    confidence:
      normalizeConfidence(
        resolved
          ?.confidence
      ),

    recognized:
      resolved?.recognized ===
      true,
  };
}

function canDiscoverCompetitors(
  entity: EntityUnderstanding
): boolean {
  /*
   * Não buscamos concorrentes quando a própria entidade
   * ainda está mal compreendida.
   */
  if (!entity.recognized) {
    return false;
  }

  if (
    entity.confidence ===
    'low'
  ) {
    return false;
  }

  /*
   * Precisamos de contexto competitivo mínimo.
   */
  return Boolean(
    entity.category ||
    entity.segment ||
    entity.problem_solved
  );
}

async function discoverCompetitors(
  entity: EntityUnderstanding
): Promise<CompetitorCandidate[]> {
  if (
    !canDiscoverCompetitors(
      entity
    )
  ) {
    return [];
  }

  const discovered =
    await fetchJsonFromOpenAI(
      [
        {
          role:
            'system',

          content:
            `Você é o motor de descoberta competitiva do ANAIA.

A entidade principal já foi entendida em uma etapa anterior.

Sua tarefa agora é identificar SOMENTE concorrentes ou alternativas realmente comparáveis.

REGRAS OBRIGATÓRIAS:
- Não invente empresas, marcas ou produtos.
- Só use entidades que você reconheça.
- Priorize concorrentes diretos.
- Um candidato deve compartilhar a mesma categoria OU resolver essencialmente o mesmo problema.
- Público-alvo semelhante reforça a comparação, mas sozinho não é suficiente.
- Não trate qualquer SaaS, fintech, e-commerce ou empresa de tecnologia como concorrente só por estar no mesmo macrosetor.
- Para produto, compare com produtos.
- Para empresa/marca, compare com empresas/marcas.
- Se a relação for apenas superficial, não retorne o candidato.
- Se não houver concorrentes suficientemente seguros, retorne [].
- Não gere rank.
- Não gere score.
- Não gere market share.
- Não gere percentual de similaridade.
- Retorne no máximo ${MAX_COMPETITORS} candidatos.
- Explique objetivamente POR QUE cada candidato é semelhante.
- Retorne apenas JSON válido.`,
        },
        {
          role:
            'user',

          content:
            `Entidade principal:

Nome: ${entity.entity_name}
Tipo: ${entity.intent}
Segmento: ${entity.segment || 'não disponível'}
Categoria: ${entity.category || 'não disponível'}
Problema resolvido: ${entity.problem_solved || 'não disponível'}
Público-alvo: ${entity.target_audience || 'não disponível'}
Descrição: ${entity.description || 'não disponível'}
Localização: ${entity.location || 'não disponível'}

Encontre até ${MAX_COMPETITORS} concorrentes ou alternativas realmente comparáveis.

Retorne exatamente:

{
  "competitors": [
    {
      "name": "nome",
      "entity_type": "company | brand | product | service | category | unknown",
      "why_similar": "explicação factual da relação competitiva",
      "similarities": [
        "semelhança objetiva 1",
        "semelhança objetiva 2"
      ],
      "same_category": true,
      "same_problem": true,
      "same_audience": true,
      "direct_competitor": true
    }
  ]
}`,
        },
      ],
      DISCOVERY_TIMEOUT_MS
    );

  const raw =
    Array.isArray(
      discovered
        ?.competitors
    )
      ? discovered.competitors
      : [];

  const seen =
    new Set<string>();

  return raw
    .map(
      (item: any) => {
        const name =
          cleanString(
            item?.name
          );

        const whySimilar =
          cleanString(
            item
              ?.why_similar
          );

        const similarities =
          cleanStringArray(
            item
              ?.similarities
          );

        if (
          !name ||
          !whySimilar ||
          similarities.length ===
            0
        ) {
          return null;
        }

        const normalizedName =
          name
            .trim()
            .toLowerCase();

        if (
          normalizedName ===
          entity.entity_name
            .trim()
            .toLowerCase()
        ) {
          return null;
        }

        if (
          seen.has(
            normalizedName
          )
        ) {
          return null;
        }

        seen.add(
          normalizedName
        );

        const candidate:
          CompetitorCandidate = {
          name,

          entity_type:
            normalizeEntityType(
              item
                ?.entity_type
            ),

          why_similar:
            whySimilar,

          similarities,

          same_category:
            booleanValue(
              item
                ?.same_category
            ),

          same_problem:
            booleanValue(
              item
                ?.same_problem
            ),

          same_audience:
            booleanValue(
              item
                ?.same_audience
            ),

          direct_competitor:
            booleanValue(
              item
                ?.direct_competitor
            ),
        };

        /*
         * TRAVA DE VALIDAÇÃO
         *
         * Só entra se:
         * - mesma categoria; OU
         * - mesmo problema resolvido.
         *
         * Isso evita casos como ANAIA -> Shopify/Nuvemshop,
         * onde a semelhança era apenas "ser SaaS".
         */
        if (
          !candidate.same_category &&
          !candidate.same_problem
        ) {
          return null;
        }

        return candidate;
      }
    )
    .filter(
      (
        item
      ): item is CompetitorCandidate =>
        item !== null
    )
    .slice(
      0,
      MAX_COMPETITORS
    );
}

function fallbackResult(
  query: string
): ResolvedQuery {
  return {
    original_query:
      query,

    intent:
      'unknown',

    entity_name:
      query,

    company_name:
      null,

    product_name:
      null,

    website:
      null,

    segment:
      null,

    category:
      null,

    problem_solved:
      null,

    target_audience:
      null,

    location:
      null,

    description:
      null,

    competitors:
      [],

    confidence:
      'low',

    recognized:
      false,

    data_sources: [
      'user_input',
    ],
  };
}

/**
 * POST /api/resolve-query
 *
 * ETAPA 1:
 * entender a entidade.
 *
 * ETAPA 2:
 * somente se houver contexto suficiente,
 * descobrir concorrentes reais e comparáveis.
 *
 * O ranking NÃO é criado aqui.
 * O ranking é calculado depois, aplicando a mesma
 * metodologia AI Visibility à empresa e aos concorrentes.
 */
export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const query =
      cleanString(
        body?.query
      );

    if (
      !query ||
      query.length < 2
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            'Query muito curta',
        },
        {
          status: 400,
        }
      );
    }

    let entity:
      EntityUnderstanding;

    try {
      entity =
        await understandEntity(
          query
        );
    } catch (error) {
      console.warn(
        '[RESOLVE QUERY] Entity understanding unavailable:',
        error
      );

      const fallback =
        fallbackResult(
          query
        );

      return NextResponse.json(
        {
          success:
            true,

          ...fallback,

          benchmark_ready:
            false,

          competitor_count:
            0,

          discovery_status:
            'entity_not_resolved',

          warning:
            'A entidade não pôde ser entendida com confiança suficiente nesta execução.',
        },
        {
          status: 200,

          headers: {
            'Cache-Control':
              'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    let competitors:
      CompetitorCandidate[] =
      [];

    let discoveryStatus =
      'not_attempted';

    if (
      canDiscoverCompetitors(
        entity
      )
    ) {
      try {
        competitors =
          await discoverCompetitors(
            entity
          );

        discoveryStatus =
          competitors.length >
          0
            ? 'validated_competitors_found'
            : 'no_validated_competitors';
      } catch (error) {
        console.warn(
          '[RESOLVE QUERY] Competitor discovery unavailable:',
          error
        );

        competitors =
          [];

        discoveryStatus =
          'discovery_unavailable';
      }
    } else {
      discoveryStatus =
        'insufficient_entity_context';
    }

    const result:
      ResolvedQuery = {
      original_query:
        query,

      intent:
        entity.intent,

      entity_name:
        entity.entity_name,

      company_name:
        entity.company_name,

      product_name:
        entity.product_name,

      website:
        entity.website,

      segment:
        entity.segment,

      category:
        entity.category,

      problem_solved:
        entity
          .problem_solved,

      target_audience:
        entity
          .target_audience,

      location:
        entity.location,

      description:
        entity.description,

      competitors,

      confidence:
        entity.confidence,

      recognized:
        entity.recognized,

      data_sources: [
        getFirstPartyContext(
          query
        )
          ? 'first_party_entity_context'
          : 'ai_entity_understanding',

        ...(competitors.length >
        0
          ? [
              'ai_competitor_discovery',
              'competitor_validation_rules',
            ]
          : []),
      ],
    };

    return NextResponse.json(
      {
        success:
          true,

        ...result,

        benchmark_ready:
          competitors.length >
          0,

        competitor_count:
          competitors.length,

        discovery_status:
          discoveryStatus,
      },
      {
        status:
          200,

        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error(
      '[RESOLVE QUERY]',
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          error instanceof
          Error
            ? error.message
            : 'Erro ao resolver query',
      },
      {
        status:
          500,
      }
    );
  }
}
