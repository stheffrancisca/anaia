import { NextRequest, NextResponse } from 'next/server';
import { analyzeWithAllModels } from '@/lib/ai-aggregator';
import type { AIAnalysisInput } from '@/lib/ai-providers/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const input: AIAnalysisInput = {
      query:
        typeof body?.query === 'string'
          ? body.query.trim()
          : '',

      company_name:
        typeof body?.company_name === 'string'
          ? body.company_name.trim()
          : null,

      website:
        typeof body?.website === 'string'
          ? body.website.trim()
          : null,

      cnpj:
        typeof body?.cnpj === 'string'
          ? body.cnpj.trim()
          : null,

      segment:
        typeof body?.segment === 'string'
          ? body.segment.trim()
          : null,

      location:
        typeof body?.location === 'string'
          ? body.location.trim()
          : null,

      country:
        typeof body?.country === 'string'
          ? body.country.trim()
          : 'Brasil',

      competitors: Array.isArray(body?.competitors)
        ? body.competitors
            .filter(
              (item: unknown): item is string =>
                typeof item === 'string'
            )
            .map((item: string) => item.trim())
            .filter(Boolean)
        : [],

      products_services: Array.isArray(
        body?.products_services
      )
        ? body.products_services
            .filter(
              (item: unknown): item is string =>
                typeof item === 'string'
            )
            .map((item: string) => item.trim())
            .filter(Boolean)
        : [],
    };

    const hasAnyUsefulInput = Boolean(
      input.query ||
        input.company_name ||
        input.website ||
        input.cnpj ||
        input.segment
    );

    if (!hasAnyUsefulInput) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Informe uma empresa, marca, site, CNPJ, segmento ou palavra-chave.',
        },
        {
          status: 400,
        }
      );
    }

    const result = await analyzeWithAllModels(
      input
    );

    if (result.models_available === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Nenhum provedor de IA conseguiu concluir a análise.',
          ai_visibility: result,
        },
        {
          status: 503,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,

        ai_visibility: result,

        summary: {
          score: result.score,

          confidence:
            result.confidence,

          coverage:
            result.coverage,

          cross_model_consistency:
            result.cross_model_consistency,

          models_available:
            result.models_available,

          models_requested:
            result.models_requested,

          observations_count:
            result.observations_count,
        },

        by_model: {
          openai: result.providers.openai
            ? {
                success:
                  result.providers.openai
                    .success,

                model:
                  result.providers.openai
                    .model,

                score:
                  result.providers.openai
                    .success
                    ? result.providers.openai
                        .score
                    : null,

                observations_count:
                  result.providers.openai
                    .observations_count,

                error:
                  result.providers.openai
                    .error || null,
              }
            : null,

          anthropic:
            result.providers.anthropic
              ? {
                  success:
                    result.providers
                      .anthropic.success,

                  model:
                    result.providers
                      .anthropic.model,

                  score:
                    result.providers
                      .anthropic.success
                      ? result.providers
                          .anthropic.score
                      : null,

                  observations_count:
                    result.providers
                      .anthropic
                      .observations_count,

                  error:
                    result.providers
                      .anthropic.error ||
                    null,
                }
              : null,

          gemini: result.providers.gemini
            ? {
                success:
                  result.providers.gemini
                    .success,

                model:
                  result.providers.gemini
                    .model,

                score:
                  result.providers.gemini
                    .success
                    ? result.providers.gemini
                        .score
                    : null,

                observations_count:
                  result.providers.gemini
                    .observations_count,

                error:
                  result.providers.gemini
                    .error || null,
              }
            : null,
        },

        dimensions:
          result.dimensions,

        methodology_version:
          result.methodology_version,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      '[AI Visibility API] error:',
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : 'Erro interno ao executar análise multi-IA.',
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      service: 'ANAIA AI Visibility',

      status: 'online',

      methodology:
        'multi-provider',

      providers: [
        {
          name: 'openai',
          configured: Boolean(
            process.env.OPENAI_API_KEY
          ),
        },
        {
          name: 'anthropic',
          configured: Boolean(
            process.env
              .ANTHROPIC_API_KEY
          ),
        },
        {
          name: 'gemini',
          configured: Boolean(
            process.env.GEMINI_API_KEY
          ),
        },
      ],
    },
    {
      status: 200,
    }
  );
}