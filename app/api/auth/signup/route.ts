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

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: 'E-mail é obrigatório.',
        },
        {
          status: 400,
        }
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Senha é obrigatória.',
        },
        {
          status: 400,
        }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error:
            'A senha deve ter pelo menos 6 caracteres.',
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      createSupabaseServerClient();

    const {
      data,
      error,
    } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error(
        '[AUTH SIGNUP]',
        error
      );

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,

        user: data.user
          ? {
              id: data.user.id,
              email: data.user.email,
            }
          : null,

        session:
          data.session
            ? {
                access_token:
                  data.session.access_token,

                refresh_token:
                  data.session.refresh_token,

                expires_at:
                  data.session.expires_at,
              }
            : null,

        requires_email_confirmation:
          !data.session,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      '[AUTH SIGNUP ERROR]',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro interno ao criar conta.',
      },
      {
        status: 500,
      }
    );
  }
}