import {
  NextRequest,
  NextResponse,
} from 'next/server';

import { createClient } from '@supabase/supabase-js';

import {
  createSupabaseServerClient,
} from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getAdminClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    throw new Error(
      'Supabase admin não configurado.'
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

function average(
  values: unknown[]
): number | null {
  const validValues =
    values.filter(
      (
        value
      ): value is number =>
        typeof value ===
          'number' &&
        Number.isFinite(value)
    );

  if (
    validValues.length === 0
  ) {
    return null;
  }

  const total =
    validValues.reduce(
      (sum, value) =>
        sum + value,
      0
    );

  return (
    Math.round(
      (total /
        validValues.length) *
        10
    ) / 10
  );
}

export async function GET(
  request: NextRequest
) {
  try {
    const accessToken =
      request.cookies.get(
        'anaia_access_token'
      )?.value;

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          error:
            'Usuário não autenticado.',
        },
        {
          status: 401,
        }
      );
    }

    const authClient =
      createSupabaseServerClient();

    const {
      data: authData,
      error: authError,
    } =
      await authClient.auth.getUser(
        accessToken
      );

    if (
      authError ||
      !authData?.user
    ) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          error:
            'Sessão inválida ou expirada.',
        },
        {
          status: 401,
        }
      );
    }

    const url =
      new URL(request.url);

    const company =
      url.searchParams
        .get('company')
        ?.trim() ||
      null;

    const limitParam =
      Number(
        url.searchParams.get(
          'limit'
        ) || 100
      );

    const limit =
      Number.isFinite(
        limitParam
      )
        ? Math.min(
            Math.max(
              Math.floor(
                limitParam
              ),
              1
            ),
            500
          )
        : 100;

    const supabase =
      getAdminClient();

    let diagnosticsQuery =
      supabase
        .from('diagnostics')
        .select(`
          id,
          user_id,
          company_name,
          query,
          segment,
          location,
          website,
          cnpj,
          ai_visibility_score,
          confidence,
          coverage,
          presence,
          recommendation,
          position,
          relevance,
          competitive_share,
          consistency,
          models_requested,
          models_available,
          observations_count,
          abvs_score,
          digital_authority,
          competitive_position,
          methodology_version,
          created_at
        `)
        .order(
          'created_at',
          {
            ascending: true,
          }
        )
        .limit(limit)
        .or(
          `user_id.eq.${authData.user.id},user_id.is.null`
        );

    if (company) {
      diagnosticsQuery =
        diagnosticsQuery.ilike(
          'company_name',
          company
        );
    }

    const {
      data: diagnostics,
      error:
        diagnosticsError,
    } =
      await diagnosticsQuery;

    if (
      diagnosticsError
    ) {
      throw new Error(
        diagnosticsError.message
      );
    }

    const diagnosticIds =
      (
        diagnostics ||
        []
      ).map(
        (item: any) =>
          item.id
      );

    let providers:
      any[] = [];

    let observations:
      any[] = [];

    if (
      diagnosticIds.length >
      0
    ) {
      /*
       * PROVIDERS
       */
      const {
        data:
          providerRows,
        error:
          providersError,
      } =
        await supabase
          .from(
            'diagnostic_providers'
          )
          .select(`
            diagnostic_id,
            provider,
            model,
            score,
            success,
            observations_count,
            error_code,
            error_message,
            created_at
          `)
          .in(
            'diagnostic_id',
            diagnosticIds
          );

      if (
        providersError
      ) {
        console.warn(
          '[HISTORY API] Provider history unavailable:',
          providersError.message
        );
      } else {
        providers =
          providerRows ||
          [];
      }

      /*
       * OBSERVATIONS
       */
      const {
        data:
          observationRows,
        error:
          observationsError,
      } =
        await supabase
          .from(
            'diagnostic_observations'
          )
          .select(`
            id,
            diagnostic_id,
            provider,
            model,
            prompt,
            response,
            prompt_category,
            topic,
            presence,
            recommendation,
            position,
            relevance,
            competitive_share,
            consistency,
            created_at
          `)
          .in(
            'diagnostic_id',
            diagnosticIds
          )
          .order(
            'created_at',
            {
              ascending: true,
            }
          );

      if (
        observationsError
      ) {
        console.warn(
          '[HISTORY API] Observation history unavailable:',
          observationsError.message
        );
      } else {
        observations =
          observationRows ||
          [];
      }
    }

    /*
     * GROUP PROVIDERS
     */
    const providersByDiagnostic =
      providers.reduce(
        (
          acc:
            Record<
              string,
              any
            >,
          row:
            any
        ) => {
          if (
            !acc[
              row
                .diagnostic_id
            ]
          ) {
            acc[
              row
                .diagnostic_id
            ] = {};
          }

          acc[
            row
              .diagnostic_id
          ][
            row.provider
          ] = {
            provider:
              row.provider,

            model:
              row.model,

            score:
              row.score,

            success:
              row.success,

            observations_count:
              row
                .observations_count,

            error_code:
              row
                .error_code,

            error_message:
              row
                .error_message,
          };

          return acc;
        },
        {}
      );

    /*
     * GROUP OBSERVATIONS
     */
    const observationsByDiagnostic =
      observations.reduce(
        (
          acc:
            Record<
              string,
              any[]
            >,
          row:
            any
        ) => {
          if (
            !acc[
              row
                .diagnostic_id
            ]
          ) {
            acc[
              row
                .diagnostic_id
            ] = [];
          }

          acc[
            row
              .diagnostic_id
          ].push(row);

          return acc;
        },
        {}
      );

    /*
     * BUILD HISTORY
     */
    const history =
      (
        diagnostics ||
        []
      ).map(
        (
          item:
            any
        ) => {
          const itemObservations =
            observationsByDiagnostic[
              item.id
            ] || [];

          const providers =
            providersByDiagnostic[
              item.id
            ] || {};

          /*
           * AGRUPAMENTO POR IA
           */
          const observationsByProvider =
            itemObservations.reduce(
              (
                acc:
                  Record<
                    string,
                    any[]
                  >,
                observation:
                  any
              ) => {
                const provider =
                  observation.provider;

                if (
                  !acc[
                    provider
                  ]
                ) {
                  acc[
                    provider
                  ] = [];
                }

                acc[
                  provider
                ].push(
                  observation
                );

                return acc;
              },
              {}
            );

          const providerMetrics =
            Object.entries(
              observationsByProvider
            ).reduce(
              (
                acc:
                  Record<
                    string,
                    any
                  >,
                [
                  provider,
                  providerObservations,
                ]
              ) => {
                const rows =
                  providerObservations as any[];

                acc[
                  provider
                ] = {
                  observations_count:
                    rows.length,

                  presence:
                    average(
                      rows.map(
                        (
                          row
                        ) =>
                          row.presence
                      )
                    ),

                  recommendation:
                    average(
                      rows.map(
                        (
                          row
                        ) =>
                          row.recommendation
                      )
                    ),

                  position:
                    average(
                      rows.map(
                        (
                          row
                        ) =>
                          row.position
                      )
                    ),

                  relevance:
                    average(
                      rows.map(
                        (
                          row
                        ) =>
                          row.relevance
                      )
                    ),

                  competitive_share:
                    average(
                      rows.map(
                        (
                          row
                        ) =>
                          row
                            .competitive_share
                      )
                    ),

                  consistency:
                    average(
                      rows.map(
                        (
                          row
                        ) =>
                          row.consistency
                      )
                    ),
                };

                return acc;
              },
              {}
            );

          /*
           * MERGE PROVIDER STATUS + METRICS
           */
          const finalProviders =
            Object.keys({
              ...providers,
              ...providerMetrics,
            }).reduce(
              (
                acc:
                  Record<
                    string,
                    any
                  >,
                provider
              ) => {
                acc[
                  provider
                ] = {
                  ...(
                    providers[
                      provider
                    ] ||
                    {}
                  ),

                  ...(
                    providerMetrics[
                      provider
                    ] ||
                    {}
                  ),
                };

                return acc;
              },
              {}
            );

          return {
            id:
              item.id,

            date:
              item
                .created_at,

            company:
              item
                .company_name,

            score:
              item
                .ai_visibility_score,

            confidence:
              item
                .confidence,

            coverage:
              item
                .coverage,

            presence:
              item
                .presence,

            recommendation:
              item
                .recommendation,

            position:
              item
                .position,

            relevance:
              item
                .relevance,

            competitive_share:
              item
                .competitive_share,

            consistency:
              item
                .consistency,

            models_requested:
              item
                .models_requested,

            models_available:
              item
                .models_available,

            observations_count:
              item
                .observations_count,

            abvs:
              item
                .abvs_score,

            digital_authority:
              item
                .digital_authority,

            competitive_position:
              item
                .competitive_position,

            segment:
              item.segment,

            location:
              item.location,

            methodology_version:
              item
                .methodology_version,

            providers:
              finalProviders,

            observations:
              itemObservations,
          };
        }
      );

    return NextResponse.json(
      {
        success: true,

        authenticated:
          true,

        user: {
          id:
            authData
              .user.id,

          email:
            authData
              .user
              .email ||
            '',
        },

        company,

        count:
          history.length,

        history,
      },
      {
        status: 200,

        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error(
      '[HISTORY API]',
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : 'Erro ao carregar histórico.',
      },
      {
        status: 500,

        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}