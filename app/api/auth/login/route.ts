import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email =
      typeof body?.email === 'string'
        ? body.email.trim()
        : '';

    const password =
      typeof body?.password === 'string'
        ? body.password
        : '';

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'E-mail e senha são obrigatórios.',
        },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error || !data.session || !data.user) {
      return NextResponse.json(
        {
          success: false,
          error:
            error?.message ||
            'Não foi possível realizar o login.',
        },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email || '',
      },
    });

    response.cookies.set(
      'anaia_access_token',
      data.session.access_token,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: data.session.expires_in,
      }
    );

    response.cookies.set(
      'anaia_refresh_token',
      data.session.refresh_token,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      }
    );

    return response;
  } catch (error) {
    console.error('[AUTH LOGIN]', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro interno no login.',
      },
      { status: 500 }
    );
  }
}