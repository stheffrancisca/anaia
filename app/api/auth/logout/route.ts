import {
  NextRequest,
  NextResponse,
} from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest
) {
  try {
    const accessToken =
      request.cookies.get(
        'anaia_access_token'
      )?.value;

    if (accessToken) {
      const supabase =
        createSupabaseServerClient();

      await supabase.auth.signOut();
    }

    const response =
      NextResponse.json({
        success: true,
      });

    response.cookies.set(
      'anaia_access_token',
      '',
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      }
    );

    response.cookies.set(
      'anaia_refresh_token',
      '',
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      }
    );

    return response;
  } catch (error) {
    console.error(
      '[AUTH LOGOUT]',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao encerrar sessão.',
      },
      { status: 500 }
    );
  }
}