import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  createSupabaseServerClient,
} from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function clearAuthCookies(
  response: NextResponse
) {
  const cookieOptions = {
    httpOnly: true,
    secure:
      process.env.NODE_ENV ===
      'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };

  response.cookies.set(
    'anaia_access_token',
    '',
    cookieOptions
  );

  response.cookies.set(
    'anaia_refresh_token',
    '',
    cookieOptions
  );

  return response;
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
    } =
      await supabase.auth.getUser(
        accessToken
      );

    if (
      error ||
      !data?.user
    ) {
      console.warn(
        '[AUTH ME] Invalid session:',
        error?.message ||
          'User not found'
      );

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

      return clearAuthCookies(
        response
      );
    }

    return NextResponse.json(
      {
        success: true,
        authenticated: true,

        user: {
          id: data.user.id,

          email:
            data.user.email ||
            '',

          created_at:
            data.user.created_at ||
            null,
        },
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
      '[AUTH ME] Unexpected error:',
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
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}