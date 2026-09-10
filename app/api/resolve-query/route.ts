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
const CANONICAL_GROUP_SIZE = 4;
const RESOLUTION_TIMEOUT_MS = 12000;
const PEER_GROUP_TIMEOUT_MS = 14000;

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

type EntityResolution = {
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
  country: string | null;
  description: string | null;
  confidence: ConfidenceLevel;
  recognized: boolean;
  canonical_market: string | null;
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
  country: string | null;
  description: string | null;
  competitors: CompetitorCandidate[];
  confidence: ConfidenceLevel;
  recognized: boolean;
  canonical_market: string | null;
  peer_group: string[];
  peer_group_key: string | null;
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
      (item): item is string =>
        typeof item === 'string'
    )
    .map((item) =>
      item.trim()
    )
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeKey(
  value: string
): string {
  return value
    .trim()
    .toLocaleLowerCase(
      'pt-BR'
    );
}

function uniqueNames(
  values: string[]
): string[] {
  const seen =
    new Set<string>();

  const result: string[] =
    [];

  for (
    const value of values
  ) {
    const name =
      value.trim();

    if (!name) {
      continue;
    }

    const key =
      normalizeKey(
        name
      );

    if (
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);
    result.push(name);
  }

  return result;
}

function getFirstPartyContext(
  query: string
): Partial<EntityResolution> | null {
  const normalized =
    normalizeKey(
      query
    );

  /*
   * Contexto first-party apenas para o próprio produto ANAIA.
   * Não define concorrentes manualmente.
   */
  if (
    normalized === 'anaia' ||
    normalized === 'apareça na ia' ||
    normalized === 'apareca na ia'
  ) {
    return {
      intent:
        'company',
      entity_name:
        'ANAIA',
      company_name:
        'ANAIA',
      product_name:
        null,
      website:
        'aparecanaia.com.br',
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
      country:
        'Brasil',
      description:
        'Plataforma de inteligência de visibilidade em IA para monitorar presença, recomendação e posição competitiva de marcas.',
      confidence:
        'high',
      recognized:
        true,
      canonical_market:
        'AI Visibility / GEO platforms',
    };
  }

  return null;
}

async function fetchJsonFromOpenAI(
  messages: Array<{
    role:
      | 'system'
      | 'user';
    content:
      string;
  }>,
  timeoutMs:
    number
): Promise<any> {
  if (
    !OPENAI_API_KEY
  ) {
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
          method:
            'POST',

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

    if (
      !response.ok
    ) {
      const errorText =
        await response.text();

      throw new Error(
        `OpenAI resolve-query ${response.status}: ${
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

async function resolveEntity(
  query: string
): Promise<EntityResolution> {
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

      country:
        firstParty.country ||
        'Brasil',

      description:
        firstParty.description ||
        null,

      confidence:
        firstParty.confidence ||
        'high',

      recognized:
        firstParty.recognized ??
        true,

      canonical_market:
        firstParty.canonical_market ||
        null,
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

Nesta etapa você NÃO escolhe concorrentes.

Sua tarefa é identificar:
- o que foi pesquisado;
- a categoria específica;
- o problema principal resolvido;
- o público-alvo;
- e principalmente um MERCADO CANÔNICO.

REGRAS:
- Não invente fatos.
- Se não reconhecer a entidade com segurança, recognized=false.
- Se estiver incerto sobre algum campo, retorne null.
- "canonical_market" deve representar o mercado competitivo de forma neutra e independente do nome da empresa.
- Empresas que competem diretamente entre si devem receber o mesmo canonical_market sempre que possível.
- Exemplos de bom canonical_market:
  "bancos digitais de varejo no Brasil"
  "plataformas de e-commerce SaaS no Brasil"
  "smartphones premium"
  "plataformas de AI Visibility / GEO"
- Não inclua o nome da entidade no canonical_market.
- Retorne somente JSON válido.`,
        },
        {
          role:
            'user',

          content:
            `Resolva esta pesquisa:

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
  "location": "mercado/localização quando relevante ou null",
  "country": "país principal ou null",
  "description": "descrição curta e factual ou null",
  "confidence": "high | medium | low",
  "recognized": true,
  "canonical_market": "mercado competitivo canônico, neutro e sem o nome da entidade"
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

    country:
      cleanString(
        resolved?.country
      ) || 'Brasil',

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

    canonical_market:
      cleanString(
        resolved
          ?.canonical_market
      ),
  };
}

function canBuildPeerGroup(
  entity:
    EntityResolution
): boolean {
  if (
    !entity.recognized
  ) {
    return false;
  }

  if (
    entity.confidence ===
    'low'
  ) {
    return false;
  }

  return Boolean(
    entity.canonical_market &&
    (
      entity.category ||
      entity.segment ||
      entity.problem_solved
    )
  );
}

function buildPeerGroupKey(
  entity:
    EntityResolution
): string | null {
  if (
    !entity.canonical_market
  ) {
    return null;
  }

  const country =
    entity.country ||
    'Brasil';

  return `${normalizeKey(
    entity.canonical_market
  )}::${normalizeKey(
    country
  )}`;
}

async function discoverCanonicalPeerGroup(
  entity:
    EntityResolution
): Promise<{
  competitors:
    CompetitorCandidate[];
  peer_group:
    string[];
}> {
  if (
    !canBuildPeerGroup(
      entity
    )
  ) {
    return {
      competitors:
        [],
      peer_group:
        [
          entity.entity_name,
        ],
    };
  }

  const discovered =
    await fetchJsonFromOpenAI(
      [
        {
          role:
            'system',

          content:
            `Você é o motor de construção de peer groups canônicos do ANAIA.

OBJETIVO:
Criar um grupo competitivo ESTÁVEL e NEUTRO.

O grupo NÃO deve mudar só porque outra empresa do mesmo mercado foi pesquisada.

REGRAS OBRIGATÓRIAS:
- Use principalmente o canonical_market, país, categoria, problema resolvido e público.
- Não escolha empresas porque o usuário digitou primeiro.
- Não favoreça a entidade pesquisada.
- Não invente empresas, marcas ou produtos.
- Só retorne entidades reconhecidas.
- Priorize concorrentes diretos.
- Não misture macrosetores apenas porque todos são "tecnologia", "SaaS" ou "fintech".
- O grupo total deve ter no máximo ${CANONICAL_GROUP_SIZE} entidades contando a entidade pesquisada.
- Se a entidade pesquisada pertence claramente ao mercado, ela deve estar no grupo.
- Ordene o grupo final alfabeticamente, não por importância.
- O mesmo mercado deve tender ao mesmo grupo canônico.
- Não gere score.
- Não gere ranking.
- Não gere market share.
- Retorne apenas JSON válido.`,
        },
        {
          role:
            'user',

          content:
            `Construa o peer group canônico deste mercado.

Mercado canônico:
${entity.canonical_market}

País:
${entity.country || 'Brasil'}

Categoria:
${entity.category || 'não disponível'}

Segmento:
${entity.segment || 'não disponível'}

Problema resolvido:
${entity.problem_solved || 'não disponível'}

Público:
${entity.target_audience || 'não disponível'}

Entidade pesquisada:
${entity.entity_name}

Retorne exatamente:

{
  "peer_group": [
    "entidade 1",
    "entidade 2",
    "entidade 3",
    "entidade 4"
  ],
  "competitors": [
    {
      "name": "nome",
      "entity_type": "company | brand | product | service | category | unknown",
      "why_similar": "por que pertence ao mesmo peer group",
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
      PEER_GROUP_TIMEOUT_MS
    );

  const rawPeerGroup =
    uniqueNames(
      cleanStringArray(
        discovered
          ?.peer_group
      )
    );

  /*
   * A entidade pesquisada deve estar no universo
   * quando pertence ao mercado.
   */
  const withEntity =
    uniqueNames([
      entity.entity_name,
      ...rawPeerGroup,
    ]);

  /*
   * Ordenação alfabética estabiliza a representação.
   */
  const peerGroup =
    withEntity
      .sort(
        (a, b) =>
          a.localeCompare(
            b,
            'pt-BR',
            {
              sensitivity:
                'base',
            }
          )
      )
      .slice(
        0,
        CANONICAL_GROUP_SIZE
      );

  /*
   * Se o slice retirou acidentalmente a entidade principal,
   * substituímos o último item para garantir sua presença.
   */
  if (
    !peerGroup.some(
      (name) =>
        normalizeKey(name) ===
        normalizeKey(
          entity.entity_name
        )
    )
  ) {
    if (
      peerGroup.length >=
      CANONICAL_GROUP_SIZE
    ) {
      peerGroup[
        peerGroup.length - 1
      ] =
        entity.entity_name;
    } else {
      peerGroup.push(
        entity.entity_name
      );
    }

    peerGroup.sort(
      (a, b) =>
        a.localeCompare(
          b,
          'pt-BR',
          {
            sensitivity:
              'base',
          }
        )
    );
  }

  const allowedNames =
    new Set(
      peerGroup.map(
        normalizeKey
      )
    );

  const rawCompetitors =
    Array.isArray(
      discovered
        ?.competitors
    )
      ? discovered.competitors
      : [];

  const competitorByName =
    new Map<
      string,
      CompetitorCandidate
    >();

  for (
    const item of
    rawCompetitors
  ) {
    const name =
      cleanString(
        item?.name
      );

    if (!name) {
      continue;
    }

    const key =
      normalizeKey(
        name
      );

    if (
      key ===
      normalizeKey(
        entity.entity_name
      )
    ) {
      continue;
    }

    if (
      !allowedNames.has(
        key
      )
    ) {
      continue;
    }

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

    const sameCategory =
      item
        ?.same_category ===
      true;

    const sameProblem =
      item
        ?.same_problem ===
      true;

    if (
      !whySimilar ||
      similarities.length ===
        0
    ) {
      continue;
    }

    /*
     * Trava de comparabilidade.
     */
    if (
      !sameCategory &&
      !sameProblem
    ) {
      continue;
    }

    competitorByName.set(
      key,
      {
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
          sameCategory,
        same_problem:
          sameProblem,
        same_audience:
          item
            ?.same_audience ===
          true,
        direct_competitor:
          item
            ?.direct_competitor ===
          true,
      }
    );
  }

  /*
   * Só entram concorrentes que fazem parte do
   * peer group final. A ordem também é canônica.
   */
  const competitors =
    peerGroup
      .filter(
        (name) =>
          normalizeKey(
            name
          ) !==
          normalizeKey(
            entity.entity_name
          )
      )
      .map(
        (name) =>
          competitorByName.get(
            normalizeKey(
              name
            )
          )
      )
      .filter(
        (
          item
        ): item is CompetitorCandidate =>
          Boolean(item)
      )
      .slice(
        0,
        MAX_COMPETITORS
      );

  /*
   * Se a IA incluiu um nome no peer_group, mas não conseguiu
   * justificá-lo/validá-lo, ele não entra no benchmark.
   * Reconstruímos então o grupo a partir dos concorrentes validados.
   */
  const validatedPeerGroup =
    uniqueNames([
      entity.entity_name,
      ...competitors.map(
        (item) =>
          item.name
      ),
    ]).sort(
      (a, b) =>
        a.localeCompare(
          b,
          'pt-BR',
          {
            sensitivity:
              'base',
          }
        )
    );

  return {
    competitors,
    peer_group:
      validatedPeerGroup,
  };
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
    country:
      'Brasil',
    description:
      null,
    competitors:
      [],
    confidence:
      'low',
    recognized:
      false,
    canonical_market:
      null,
    peer_group:
      [query],
    peer_group_key:
      null,
    data_sources: [
      'user_input',
    ],
  };
}

export async function POST(
  request:
    NextRequest
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
          status:
            400,
        }
      );
    }

    let entity:
      EntityResolution;

    try {
      entity =
        await resolveEntity(
          query
        );
    } catch (error) {
      console.warn(
        '[RESOLVE QUERY] Entity resolution unavailable:',
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
          status:
            200,
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

    let peerGroup:
      string[] = [
        entity.entity_name,
      ];

    let discoveryStatus =
      'not_attempted';

    if (
      canBuildPeerGroup(
        entity
      )
    ) {
      try {
        const peerResult =
          await discoverCanonicalPeerGroup(
            entity
          );

        competitors =
          peerResult.competitors;

        peerGroup =
          peerResult.peer_group;

        discoveryStatus =
          competitors.length >
          0
            ? 'canonical_peer_group_ready'
            : 'no_validated_competitors';
      } catch (error) {
        console.warn(
          '[RESOLVE QUERY] Canonical peer group unavailable:',
          error
        );

        discoveryStatus =
          'peer_group_unavailable';
      }
    } else {
      discoveryStatus =
        'insufficient_entity_context';
    }

    const peerGroupKey =
      buildPeerGroupKey(
        entity
      );

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

      country:
        entity.country,

      description:
        entity.description,

      competitors,

      confidence:
        entity.confidence,

      recognized:
        entity.recognized,

      canonical_market:
        entity.canonical_market,

      peer_group:
        peerGroup,

      peer_group_key:
        peerGroupKey,

      data_sources: [
        getFirstPartyContext(
          query
        )
          ? 'first_party_entity_context'
          : 'ai_entity_resolution',

        ...(competitors.length >
        0
          ? [
              'canonical_market_resolution',
              'canonical_peer_group_discovery',
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

        benchmark_context: {
          canonical_market:
            entity.canonical_market,

          peer_group_key:
            peerGroupKey,

          peer_group:
            peerGroup,

          peer_group_size:
            peerGroup.length,

          methodology:
            'canonical-peer-group-v1',
        },
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
