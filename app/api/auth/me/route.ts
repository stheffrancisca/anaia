import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
          user: null,
        },
        {
          status: 401,
        }
      );
    }

    const supabase =
      createSupabaseServerClient();

    const {
      data,
      error,
    } = await supabase.auth.getUser(
      accessToken
    );

    if (
      error ||
      !data.user
    ) {
      const response =
        NextResponse.json(
          {
            success: false,
            authenticated: false,
            user: null,
          },
          {
            status: 401,
          }
        );

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
    }

    return NextResponse.json(
      {
        success: true,
        authenticated: true,

        user: {
          id: data.user.id,
          email:
            data.user.email || '',
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      '[AUTH ME]',
      error
    );

    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        user: null,
        error:
          'Erro ao verificar sessão.',
      },
      {
        status: 500,
      }
    );
  }
}