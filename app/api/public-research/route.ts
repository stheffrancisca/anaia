import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

const SECTOR_ALIASES: Record<string, string[]> = {
  Fintechs: [
    'fintech',
    'banco digital',
    'servicos financeiros digitais',
    'pagamentos digitais',
    'conta digital',
  ],
  Bancos: [
    'banco',
    'banking',
    'instituicao financeira',
    'conta corrente',
    'conta digital',
    'cartao',
  ],
  'E-commerce': [
    'e-commerce',
    'ecommerce',
    'comercio eletronico',
    'marketplace',
    'loja virtual',
  ],
  Cosméticos: [
    'cosmetico',
    'beleza',
    'skincare',
    'cuidados pessoais',
  ],
  Educação: [
    'educacao',
    'education',
    'edtech',
    'ensino',
    'curso',
  ],
  SaaS: [
    'saas',
    'software as a service',
    'software',
    'plataforma',
  ],
  Varejo: [
    'varejo',
    'retail',
    'loja',
  ],
  Seguros: [
    'seguro',
    'insurance',
    'insurtech',
  ],
  Saúde: [
    'saude',
    'health',
    'healthtech',
    'clinica',
  ],
  Tecnologia: [
    'tecnologia',
    'technology',
    'tech',
    'software',
  ],
};

/*
 * Ajuda de classificação para entidades conhecidas quando
 * diagnósticos antigos foram salvos sem "segment" consistente.
 *
 * IMPORTANTE:
 * aliases ambíguos como "inter" NÃO podem usar substring.
 * Caso contrário "Sport Club Internacional" vira banco.
 *
 * Esses aliases só classificam registros reais já existentes.
 * Não criam novas pesquisas nem alteram contagens.
 */
const ENTITY_SECTOR_EXACT_HINTS: Record<string, string[]> = {
  Bancos: [
    'nubank',
    'banco inter',
    'inter',
    'c6 bank',
    'c6',
    'pagbank',
    'pagseguro',
    'banco original',
    'neon',
    'itau',
    'itaú',
    'bradesco',
    'santander',
    'caixa',
    'caixa economica federal',
    'caixa econômica federal',
    'banco do brasil',
    'btg',
    'btg pactual',
    'mercado pago',
    'picpay',
  ],
  Fintechs: [
    'nubank',
    'banco inter',
    'inter',
    'c6 bank',
    'c6',
    'pagbank',
    'pagseguro',
    'neon',
    'mercado pago',
    'picpay',
    'stone',
  ],
};

type DiagnosticRow = {
  id: string;
  company_name: string | null;
  query: string | null;
  segment: string | null;
  recommendation: number | null;
  created_at: string;
};

type ObservationRow = {
  diagnostic_id: string;
  provider: string;
  recommendation: number | null;
  response: string | null;
  created_at: string;
};

type CompetitorRow = {
  diagnostic_id: string;
  company_name: string | null;
  score: number | null;
};

function getSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalize(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchesSector(row: DiagnosticRow, sector: string) {
  const aliases = SECTOR_ALIASES[sector] || [sector];

  const normalizedSegment = normalize(row.segment);
  const normalizedQuery = normalize(row.query);
  const normalizedCompany = normalize(row.company_name);

  /*
   * Proteção contra falsos positivos financeiros.
   * Ex.: "Sport Club Internacional" não pode entrar em Bancos
   * mesmo se um diagnóstico antigo tiver segmento incorreto.
   */
  if (sector === 'Bancos' || sector === 'Fintechs') {
    const nonFinancialSignals = [
      'sport club',
      'futebol',
      'football',
      'clube',
      'internacional de porto alegre',
    ];

    const identityText = `${normalizedCompany} ${normalizedQuery}`;

    if (
      nonFinancialSignals.some((signal) =>
        identityText.includes(normalize(signal))
      )
    ) {
      return false;
    }
  }

  /*
   * 1) Primeiro usamos o segmento, que é o sinal mais confiável.
   */
  const segmentMatch = aliases.some((alias) =>
    normalizedSegment.includes(normalize(alias))
  );

  if (segmentMatch) {
    return true;
  }

  /*
   * 2) Depois aceitamos termos setoriais explícitos na query.
   * Ex.: "bancos digitais", "fintechs", "instituição financeira".
   */
  const explicitQueryMatch = aliases.some((alias) => {
    const normalizedAlias = normalize(alias);

    if (normalizedAlias.length < 5) {
      return false;
    }

    return normalizedQuery.includes(normalizedAlias);
  });

  if (explicitQueryMatch) {
    return true;
  }

  /*
   * 3) Para nomes de empresas conhecidas, usamos SOMENTE igualdade exata.
   * Isso impede "inter" de casar com "Sport Club Internacional".
   */
  const exactHints = ENTITY_SECTOR_EXACT_HINTS[sector] || [];

  return exactHints.some((entity) => {
    const normalizedEntity = normalize(entity);

    return (
      normalizedCompany === normalizedEntity ||
      normalizedQuery === normalizedEntity
    );
  });
}

function pct(num: number, den: number) {
  if (den <= 0) return null;
  return Math.round((num / den) * 1000) / 10;
}

function growthPct(current: number, previous: number) {
  if (previous <= 0) return null;
  return Math.round((((current - previous) / previous) * 100) * 10) / 10;
}

function providerLabel(provider: string) {
  if (provider === 'openai') return 'ChatGPT';
  if (provider === 'gemini') return 'Gemini';
  if (provider === 'anthropic') return 'Claude';
  return provider;
}

function safeName(row: DiagnosticRow) {
  const value = row.company_name || row.query;
  if (!value || value.trim().length < 2) return null;
  return value.trim();
}


function hourInSaoPaulo(dateValue: string) {
  const date = new Date(dateValue);

  const hourText = new Intl.DateTimeFormat(
    'pt-BR',
    {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      hour12: false,
    }
  ).format(date);

  const hour = Number(
    hourText.replace(/\D/g, '')
  );

  return Number.isFinite(hour)
    ? Math.max(0, Math.min(23, hour))
    : 0;
}

function weekOfMonth(dateValue: string) {
  const date = new Date(dateValue);
  const day = date.getDate();
  return Math.min(5, Math.floor((day - 1) / 7) + 1);
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round(
    (values.reduce((sum, value) => sum + value, 0) / values.length) * 10
  ) / 10;
}



function uniqueCaseInsensitive(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const clean = value.trim();
    if (!clean) continue;

    const key = normalize(clean);

    if (seen.has(key)) continue;

    seen.add(key);
    result.push(clean);
  }

  return result;
}

function buildEntityAliases(name: string) {
  const clean = name.trim();
  const normalized = normalize(clean);

  const aliases = new Set<string>([normalized]);

  const withoutLegalSuffix = normalized
    .replace(/\b(s\.?a\.?|ltda\.?|sa)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (withoutLegalSuffix.length >= 3) {
    aliases.add(withoutLegalSuffix);
  }

  if (normalized.startsWith('banco ')) {
    const shortName = normalized.replace(/^banco\s+/, '').trim();

    /*
     * Evitamos aliases muito curtos/ambíguos.
     * Ex.: "inter" sozinho pode casar com "Internacional".
     */
    if (shortName.length >= 6) {
      aliases.add(shortName);
    }
  }

  return Array.from(aliases)
    .filter((alias) => alias.length >= 3);
}

function responseMentionsEntity(
  response: string,
  entityName: string
) {
  const normalizedResponse = normalize(response);
  const aliases = buildEntityAliases(entityName);

  return aliases.some((alias) => {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
    return pattern.test(normalizedResponse);
  });
}


function inferSectorFromDiagnostic(row: DiagnosticRow): string | null {
  const orderedSectors = Object.keys(SECTOR_ALIASES);

  for (const sector of orderedSectors) {
    if (matchesSector(row, sector)) {
      return sector;
    }
  }

  return null;
}

function parseSelectedDate(value: string | null) {
  const todayText = new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }
  ).format(new Date());

  const candidate = value || todayText;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    return {
      valid: false,
      dateText: todayText,
      error: 'Data inválida.',
    };
  }

  const selected = new Date(`${candidate}T12:00:00-03:00`);
  const today = new Date(`${todayText}T12:00:00-03:00`);

  const diffMs = today.getTime() - selected.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays < 0) {
    return {
      valid: false,
      dateText: todayText,
      error: 'Não é possível consultar datas futuras.',
    };
  }

  if (diffDays > 30) {
    return {
      valid: false,
      dateText: candidate,
      error:
        'O histórico público gratuito permite consultar apenas os últimos 30 dias.',
    };
  }

  return {
    valid: true,
    dateText: candidate,
    error: null,
  };
}

function dayBoundsSaoPaulo(dateText: string) {
  const start = new Date(`${dateText}T00:00:00-03:00`);
  const end = new Date(`${dateText}T23:59:59.999-03:00`);

  return {
    start,
    end,
  };
}


function saoPauloDateText(date: Date) {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }
  ).format(date);
}

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { success: false, error: 'Supabase não configurado no servidor.' },
      { status: 500 }
    );
  }

  const sector = request.nextUrl.searchParams.get('sector') || 'Fintechs';

  const todayText = saoPauloDateText(new Date());

  const todayAtNoon = new Date(
    `${todayText}T12:00:00-03:00`
  );

  const dMinusOneDate = new Date(todayAtNoon);
  dMinusOneDate.setDate(dMinusOneDate.getDate() - 1);

  let selectedDate = saoPauloDateText(dMinusOneDate);

  let { start: selectedDayStart, end: selectedDayEnd } =
    dayBoundsSaoPaulo(selectedDate);

  const previousDayDate = new Date(selectedDayStart);
  previousDayDate.setDate(previousDayDate.getDate() - 1);

  const previousDateText = new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }
  ).format(previousDayDate);

  const { start: previousDayStart, end: previousDayEnd } =
    dayBoundsSaoPaulo(previousDateText);

  try {
    const { data: diagnosticsData, error: diagnosticsError } = await supabase
      .from('diagnostics')
      .select('id,company_name,query,segment,recommendation,created_at')
      .order('created_at', { ascending: false })
      .limit(2000);

    if (diagnosticsError) throw new Error(diagnosticsError.message);

    const diagnostics = (diagnosticsData || []) as DiagnosticRow[];

    /*
     * A janela diária é baseada em diagnostic_observations.created_at.
     * Isso é o que realmente representa a atividade processada naquele dia.
     * O diagnóstico pode ter sido criado antes e receber novas observações depois.
     */
    const fallbackStartDate = new Date(selectedDayStart);
    fallbackStartDate.setDate(fallbackStartDate.getDate() - 30);

    const {
      data: recentObservationData,
      error: recentObservationError,
    } = await supabase
      .from('diagnostic_observations')
      .select('diagnostic_id,provider,recommendation,response,created_at')
      .gte('created_at', fallbackStartDate.toISOString())
      .lte('created_at', selectedDayEnd.toISOString())
      .order('created_at', { ascending: false })
      .limit(20000);

    if (recentObservationError) {
      throw new Error(recentObservationError.message);
    }

    const recentObservations =
      (recentObservationData || []) as ObservationRow[];

    const diagnosticById = new Map(
      diagnostics.map((row) => [row.id, row])
    );

    const observationMatchesSelectedSector = (
      observation: ObservationRow
    ) => {
      const diagnostic =
        diagnosticById.get(observation.diagnostic_id);

      return diagnostic
        ? matchesSector(diagnostic, sector)
        : false;
    };

    let selectedDayObservationsAllSectors =
      recentObservations.filter((observation) => {
        const created = new Date(observation.created_at);

        return (
          created >= selectedDayStart &&
          created <= selectedDayEnd
        );
      });

    let selectedDaySectorObservations =
      selectedDayObservationsAllSectors.filter(
        observationMatchesSelectedSector
      );

    let isFallback = false;
    let fallbackReason: string | null = null;

    /*
     * D-1 é a leitura preferencial.
     * Se D-1 não tiver dados para o setor selecionado,
     * usamos a data anterior mais recente com dados daquele setor.
     * A interface deixa isso explícito.
     */
    if (selectedDaySectorObservations.length === 0) {
      const latestSectorObservation =
        recentObservations.find(
          (observation) => {
            const created = new Date(observation.created_at);

            return (
              created < selectedDayStart &&
              observationMatchesSelectedSector(observation)
            );
          }
        );

      if (latestSectorObservation) {
        selectedDate = saoPauloDateText(
          new Date(latestSectorObservation.created_at)
        );

        const fallbackBounds =
          dayBoundsSaoPaulo(selectedDate);

        selectedDayStart =
          fallbackBounds.start;
        selectedDayEnd =
          fallbackBounds.end;

        selectedDayObservationsAllSectors =
          recentObservations.filter((observation) => {
            const created =
              new Date(observation.created_at);

            return (
              created >= selectedDayStart &&
              created <= selectedDayEnd
            );
          });

        selectedDaySectorObservations =
          selectedDayObservationsAllSectors.filter(
            observationMatchesSelectedSector
          );

        isFallback = true;
        fallbackReason =
          `D-1 não possui dados de ${sector}; exibindo a última leitura disponível desse setor.`;
      }
    }

    const comparisonDate = new Date(selectedDayStart);
    comparisonDate.setDate(comparisonDate.getDate() - 1);

    const comparisonDateText =
      saoPauloDateText(comparisonDate);

    const comparisonBounds =
      dayBoundsSaoPaulo(comparisonDateText);

    const previousDayObservationsAllSectors =
      recentObservations.filter((observation) => {
        const created =
          new Date(observation.created_at);

        return (
          created >= comparisonBounds.start &&
          created <= comparisonBounds.end
        );
      });

    const selectedDayIdsAllSectors = new Set(
      selectedDayObservationsAllSectors.map(
        (observation) => observation.diagnostic_id
      )
    );

    const previousDayIdsAllSectors = new Set(
      previousDayObservationsAllSectors.map(
        (observation) => observation.diagnostic_id
      )
    );

    const selectedDayRowsAllSectors = diagnostics.filter(
      (row) => selectedDayIdsAllSectors.has(row.id)
    );

    const selectedDayRowById = new Map(
      selectedDayRowsAllSectors.map((row) => [row.id, row])
    );

    const sectorTrendMap = new Map<
      string,
      {
        observations: number;
        directed: number;
        recommendation_sum: number;
        recommendation_count: number;
        by_hour: number[];
      }
    >();

    for (const observation of selectedDayObservationsAllSectors) {
      const row = selectedDayRowById.get(observation.diagnostic_id);
      if (!row) continue;

      const inferredSector = inferSectorFromDiagnostic(row);
      if (!inferredSector) continue;

      const current =
        sectorTrendMap.get(inferredSector) || {
          observations: 0,
          directed: 0,
          recommendation_sum: 0,
          recommendation_count: 0,
          by_hour: Array.from({ length: 24 }, () => 0),
        };

      const recommendation =
        typeof observation.recommendation === 'number' &&
        Number.isFinite(observation.recommendation)
          ? observation.recommendation
          : null;

      current.observations += 1;

      if (recommendation !== null) {
        current.recommendation_sum += recommendation;
        current.recommendation_count += 1;

        if (recommendation >= 50) {
          current.directed += 1;
        }
      }

      const hour = hourInSaoPaulo(observation.created_at);
      current.by_hour[hour] += 1;

      sectorTrendMap.set(inferredSector, current);
    }

    const totalSectorObservations = Array.from(
      sectorTrendMap.values()
    ).reduce((sum, item) => sum + item.observations, 0);

    const sectorTrendsSelectedDay = Array.from(sectorTrendMap.entries())
      .map(([sectorName, value]) => ({
        sector: sectorName,
        observation_count: value.observations,
        share_of_observed_ai_activity: pct(
          value.observations,
          totalSectorObservations
        ),
        direction_rate: pct(
          value.directed,
          value.recommendation_count
        ),
        average_recommendation:
          value.recommendation_count > 0
            ? Math.round(
                (value.recommendation_sum /
                  value.recommendation_count) *
                  10
              ) / 10
            : null,
        by_hour: value.by_hour.map((count, hour) => ({
          hour,
          label: `${String(hour).padStart(2, '0')}h`,
          count,
        })),
      }))
      .sort((a, b) => {
        const diff = b.observation_count - a.observation_count;
        if (diff !== 0) return diff;

        return a.sector.localeCompare(b.sector, 'pt-BR', {
          sensitivity: 'base',
        });
      })
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

    const currentRows = diagnostics.filter((row) => {
      return (
        selectedDayIdsAllSectors.has(row.id) &&
        matchesSector(row, sector)
      );
    });

    const previousRows = diagnostics.filter((row) => {
      return (
        previousDayIdsAllSectors.has(row.id) &&
        matchesSector(row, sector)
      );
    });

    const currentIds = currentRows.map((row) => row.id);
    const currentIdSet = new Set(currentIds);

    const observations: ObservationRow[] =
      selectedDaySectorObservations.filter(
        (observation) =>
          currentIdSet.has(observation.diagnostic_id)
      );

    let competitors: CompetitorRow[] = [];

    if (currentIds.length > 0) {
      const {
        data: competitorData,
        error: competitorError,
      } = await supabase
        .from('diagnostic_competitors')
        .select('diagnostic_id,company_name,score')
        .in('diagnostic_id', currentIds)
        .limit(5000);

      if (competitorError) {
        throw new Error(competitorError.message);
      }

      competitors = (competitorData || []) as CompetitorRow[];
    }

    const validObs = observations.filter(
      (item) => typeof item.recommendation === 'number' && Number.isFinite(item.recommendation)
    );

    const directedObs = validObs.filter((item) => Number(item.recommendation) >= 50);
    const directionRate = pct(directedObs.length, validObs.length);

    const providerMap = new Map<string, { total: number; directed: number }>();

    for (const observation of validObs) {
      const current = providerMap.get(observation.provider) || { total: 0, directed: 0 };
      current.total += 1;
      if (Number(observation.recommendation) >= 50) current.directed += 1;
      providerMap.set(observation.provider, current);
    }

    const recommendationByAI = Array.from(providerMap.entries())
      .map(([provider, value]) => ({
        provider,
        label: providerLabel(provider),
        recommendation_rate: pct(value.directed, value.total),
        observations: value.total,
      }))
      .filter((item) => item.recommendation_rate !== null)
      .sort((a, b) => Number(b.recommendation_rate) - Number(a.recommendation_rate));

    const searchCountByCompany = new Map<string, number>();
    const analysisCountByCompany = new Map<string, number>();
    const recommendationByCompany = new Map<string, { sum: number; count: number }>();
    const competitorScoreByCompany = new Map<string, number[]>();

    /*
     * Pesquisa primária = usuário pesquisou diretamente.
     * Análise = entidade apareceu como principal OU benchmark competitivo.
     *
     * Para o Top 5 público usamos "entidades analisadas", pois isso permite
     * refletir todo o universo realmente processado pela ANAIA sem inventar nomes.
     */
    for (const row of currentRows) {
      const name = safeName(row);
      if (!name) continue;

      searchCountByCompany.set(name, (searchCountByCompany.get(name) || 0) + 1);
      analysisCountByCompany.set(name, (analysisCountByCompany.get(name) || 0) + 1);

      if (typeof row.recommendation === 'number' && Number.isFinite(row.recommendation)) {
        const current = recommendationByCompany.get(name) || { sum: 0, count: 0 };
        current.sum += row.recommendation;
        current.count += 1;
        recommendationByCompany.set(name, current);
      }
    }

    for (const competitor of competitors) {
      const name = competitor.company_name?.trim();
      if (!name) continue;

      analysisCountByCompany.set(
        name,
        (analysisCountByCompany.get(name) || 0) + 1
      );

      if (
        typeof competitor.score === 'number' &&
        Number.isFinite(competitor.score)
      ) {
        const values = competitorScoreByCompany.get(name) || [];
        values.push(competitor.score);
        competitorScoreByCompany.set(name, values);
      }
    }

    const totalAnalysisOccurrences = Array.from(
      analysisCountByCompany.values()
    ).reduce((sum, value) => sum + value, 0);

    const mostSearched = Array.from(analysisCountByCompany.entries())
      .map(([name, count]) => ({
        name,
        count,
        primary_searches: searchCountByCompany.get(name) || 0,
        share: pct(count, totalAnalysisOccurrences),
      }))
      .sort((a, b) => {
        const countDiff = b.count - a.count;

        if (countDiff !== 0) {
          return countDiff;
        }

        return a.name.localeCompare(b.name, 'pt-BR', {
          sensitivity: 'base',
        });
      })
      .slice(0, 5)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

    const mostRecommended = Array.from(recommendationByCompany.entries())
      .map(([name, value]) => ({
        name,
        recommendation: Math.round((value.sum / value.count) * 10) / 10,
        samples: value.count,
      }))
      .sort((a, b) => b.recommendation - a.recommendation)
      .slice(0, 5);

    const previousCountByCompany = new Map<string, number>();
    for (const row of previousRows) {
      const name = safeName(row);
      if (!name) continue;
      previousCountByCompany.set(name, (previousCountByCompany.get(name) || 0) + 1);
    }

    const growingSearches = Array.from(searchCountByCompany.entries())
      .map(([name, count]) => {
        const previous = previousCountByCompany.get(name) || 0;
        return {
          name,
          current_count: count,
          previous_count: previous,
          growth: growthPct(count, previous),
          is_new: previous === 0,
        };
      })
      .sort((a, b) => {
        if (a.growth === null && b.growth === null) return b.current_count - a.current_count;
        if (a.growth === null) return 1;
        if (b.growth === null) return -1;
        return b.growth - a.growth;
      })
      .slice(0, 5);


    const hourlyCounts =
      Array.from(
        { length: 24 },
        (_, hour) => ({
          hour,
          label: `${String(hour).padStart(2, '0')}h`,
          count: 0,
        })
      );

    for (const observation of observations) {
      const hour =
        hourInSaoPaulo(
          observation.created_at
        );

      hourlyCounts[hour].count += 1;
    }

    // ------------------------------------------------------------
    // VISUAL ANALYTICS
    // ------------------------------------------------------------

    const currentRowById = new Map(
      currentRows.map((row) => [row.id, row])
    );

    const topCompanyNames = mostSearched
      .slice(0, 5)
      .map((item) => item.name);

    const weeklyMap = new Map<
      string,
      Map<number, number[]>
    >();

    for (const row of currentRows) {
      const name = safeName(row);

      if (
        !name ||
        !topCompanyNames.includes(name) ||
        typeof row.recommendation !== 'number' ||
        !Number.isFinite(row.recommendation)
      ) {
        continue;
      }

      const week = weekOfMonth(row.created_at);

      const companyWeeks =
        weeklyMap.get(name) ||
        new Map<number, number[]>();

      const values =
        companyWeeks.get(week) ||
        [];

      values.push(row.recommendation);
      companyWeeks.set(week, values);
      weeklyMap.set(name, companyWeeks);
    }

    const recommendationEvolution =
      topCompanyNames.map((name) => ({
        name,
        points: [1, 2, 3, 4, 5].map((week) => {
          const values =
            weeklyMap.get(name)?.get(week) ||
            [];

          return {
            week,
            value: average(values),
            samples: values.length,
          };
        }),
      }));

    const modelCompanyMap = new Map<
      string,
      Map<string, number[]>
    >();

    const dispersionMap = new Map<
      string,
      number[]
    >();

    for (const observation of validObs) {
      const row =
        currentRowById.get(
          observation.diagnostic_id
        );

      if (!row) continue;

      const name =
        safeName(row);

      if (
        !name ||
        !topCompanyNames.includes(name) ||
        typeof observation.recommendation !== 'number' ||
        !Number.isFinite(observation.recommendation)
      ) {
        continue;
      }

      const byProvider =
        modelCompanyMap.get(name) ||
        new Map<string, number[]>();

      const providerValues =
        byProvider.get(observation.provider) ||
        [];

      providerValues.push(
        observation.recommendation
      );

      byProvider.set(
        observation.provider,
        providerValues
      );

      modelCompanyMap.set(
        name,
        byProvider
      );

      const dispersionValues =
        dispersionMap.get(name) ||
        [];

      dispersionValues.push(
        observation.recommendation
      );

      dispersionMap.set(
        name,
        dispersionValues
      );
    }

    const comparisonByModel =
      topCompanyNames.map((name) => {
        const providerValues =
          modelCompanyMap.get(name);

        return {
          name,
          openai:
            average(
              providerValues?.get('openai') ||
              []
            ),
          gemini:
            average(
              providerValues?.get('gemini') ||
              []
            ),
          anthropic:
            average(
              providerValues?.get('anthropic') ||
              []
            ),
          benchmark_score:
            average(
              competitorScoreByCompany.get(name) ||
              []
            ),
        };
      });

    const dispersion =
      topCompanyNames.map((name) => {
        const values =
          dispersionMap.get(name) ||
          [];

        const sorted =
          [...values].sort(
            (a, b) => a - b
          );

        const min =
          sorted.length
            ? sorted[0]
            : null;

        const max =
          sorted.length
            ? sorted[sorted.length - 1]
            : null;

        const mean =
          average(sorted);

        const median =
          sorted.length
            ? sorted.length % 2 === 0
              ? Math.round(
                  ((sorted[sorted.length / 2 - 1] +
                    sorted[sorted.length / 2]) /
                    2) *
                    10
                ) / 10
              : sorted[Math.floor(sorted.length / 2)]
            : null;

        const benchmarkValues =
          competitorScoreByCompany.get(name) ||
          [];

        const fallbackMean =
          mean ??
          average(benchmarkValues);

        return {
          name,
          min:
            min ??
            (fallbackMean === null ? null : fallbackMean),
          max:
            max ??
            (fallbackMean === null ? null : fallbackMean),
          mean:
            fallbackMean,
          median:
            median ??
            fallbackMean,
          samples:
            sorted.length > 0
              ? sorted.length
              : benchmarkValues.length,
          source:
            sorted.length > 0
              ? 'observations'
              : benchmarkValues.length > 0
              ? 'benchmark'
              : 'none',
        };
      });


    /*
     * TOP ENTIDADES CITADAS NAS RESPOSTAS DAS IAS
     *
     * Universo de candidatos:
     * - empresas realmente pesquisadas no setor;
     * - concorrentes realmente persistidos nos diagnósticos.
     *
     * Métrica:
     * - quantidade de respostas em que a entidade foi citada;
     * - taxa de citação = respostas que citam a entidade / respostas textuais válidas.
     *
     * Importante: citação não é tratada como recomendação.
     */
    const candidateEntities = uniqueCaseInsensitive([
      ...currentRows
        .map((row) => safeName(row))
        .filter((name): name is string => Boolean(name)),
      ...competitors
        .map((row) => row.company_name?.trim() || '')
        .filter(Boolean),
    ]);

    const textualResponses = observations.filter(
      (item) =>
        typeof item.response === 'string' &&
        item.response.trim().length > 0
    );

    const citationCounts = new Map<string, number>();

    for (const entity of candidateEntities) {
      let count = 0;

      for (const observation of textualResponses) {
        if (
          observation.response &&
          responseMentionsEntity(
            observation.response,
            entity
          )
        ) {
          count += 1;
        }
      }

      if (count > 0) {
        citationCounts.set(entity, count);
      }
    }

    const mostCitedByAI = Array.from(citationCounts.entries())
      .map(([name, citation_count]) => ({
        name,
        citation_count,
        citation_rate: pct(
          citation_count,
          textualResponses.length
        ),
      }))
      .sort((a, b) => {
        const diff =
          b.citation_count -
          a.citation_count;

        if (diff !== 0) {
          return diff;
        }

        return a.name.localeCompare(
          b.name,
          'pt-BR',
          {
            sensitivity: 'base',
          }
        );
      })
      .slice(0, 5)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

    const topAI = recommendationByAI[0] || null;
    const spotlight = mostRecommended[0] || null;

    return NextResponse.json({
      success: true,
      sector,
      requested_date: todayText,
      selected_date: selectedDate,
      data_mode: 'D-1-preferred',
      is_fallback: isFallback,
      fallback_reason: fallbackReason,
      comparison_date: comparisonDateText,
      period: {
        start: selectedDayStart.toISOString(),
        end: selectedDayEnd.toISOString(),
      },
      access: {
        mode: 'current_day_only',
        history_enabled: false,
      },
      sector_trends_today: {
        disclaimer:
          isFallback
            ? 'D-1 não possui dados suficientes para o setor selecionado; exibindo a última leitura disponível. Não é volume global de buscas internas das IAs.'
            : 'Representa atividade observada nas respostas processadas pela ANAIA em D-1 (dia anterior); não é volume global de buscas internas do ChatGPT, Gemini ou Claude.',
        total_observations: totalSectorObservations,
        ranking: sectorTrendsSelectedDay,
        highlight:
          sectorTrendsSelectedDay.length > 0
            ? {
                sector: sectorTrendsSelectedDay[0].sector,
                observation_count:
                  sectorTrendsSelectedDay[0].observation_count,
                share:
                  sectorTrendsSelectedDay[0]
                    .share_of_observed_ai_activity,
                direction_rate:
                  sectorTrendsSelectedDay[0].direction_rate,
                average_recommendation:
                  sectorTrendsSelectedDay[0].average_recommendation,
                explanation:
                  `Foi o setor com maior atividade observada nas respostas processadas em D-1, com ${sectorTrendsSelectedDay[0].observation_count} observações${
                    sectorTrendsSelectedDay[0].share_of_observed_ai_activity !== null
                      ? ` (${Math.round(
                          sectorTrendsSelectedDay[0]
                            .share_of_observed_ai_activity as number
                        )}% da atividade observada)`
                      : ''
                  }.`,
              }
            : null,
      },
      sample: {
        current_diagnostics: currentRows.length,
        previous_diagnostics: previousRows.length,
        previous_date: previousDateText,
        valid_observations: validObs.length,
        textual_responses: textualResponses.length,
      },
      kpis: {
        research_growth_percent:
          currentRows.length > 0
            ? growthPct(currentRows.length, previousRows.length)
            : null,
        direction_rate_percent: directionRate,
        top_ai: topAI
          ? { name: topAI.label, rate: topAI.recommendation_rate }
          : null,
        sector_spotlight: spotlight
          ? { name: spotlight.name, recommendation: spotlight.recommendation }
          : null,
      },
      charts: {
        most_searched: mostSearched,
        most_cited_by_ai: mostCitedByAI,
        most_recommended: mostRecommended,
        recommendation_by_ai: recommendationByAI,
        growing_searches: growingSearches,
        research_by_hour: hourlyCounts,
        recommendation_evolution: recommendationEvolution,
        comparison_by_model: comparisonByModel,
        dispersion,
      },
    });
  } catch (error) {
    console.error('[PUBLIC RESEARCH]', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao gerar pesquisa pública.',
      },
      { status: 500 }
    );
  }
}
