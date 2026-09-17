import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, max = 300) {
  return typeof value === 'string'
    ? value.trim().slice(0, max)
    : '';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = clean(body?.name, 120);
    const company = clean(body?.company, 160);
    const website = clean(body?.website, 300);
    const email = clean(body?.email, 180).toLowerCase();
    const segment = clean(body?.segment, 120);
    const mainCompetitor = clean(body?.main_competitor, 180);

    if (!name || !company || !email || !segment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Preencha nome, empresa, e-mail e segmento.',
        },
        { status: 400 }
      );
    }

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Informe um e-mail válido.',
        },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { error } = await supabase
      .from('leads')
      .insert({
        name,
        company,
        website: website || null,
        email,
        segment,
        main_competitor: mainCompetitor || null,
        source: 'site_analise_gratuita',
        status: 'new',
      });

    if (error) {
      console.error('Lead insert error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Não foi possível registrar sua solicitação agora.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Lead API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao processar a solicitação.',
      },
      { status: 500 }
    );
  }
}
