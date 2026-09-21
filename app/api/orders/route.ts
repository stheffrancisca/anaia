import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = new Set([
  'interessado',
  'proposta_enviada',
  'aguardando_pagamento',
  'pago',
  'em_analise',
  'entregue',
]);

function adminEmails() {
  return String(process.env.ANAIA_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

async function requireAdmin() {
  const cookieStore = cookies();
  const accessToken =
    cookieStore.get('anaia_access_token')?.value || '';

  if (!accessToken) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: 'Não autenticado.' },
        { status: 401 }
      ),
    };
  }

  const supabaseAuth = createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabaseAuth.auth.getUser(accessToken);

  if (error || !user?.email) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: 'Sessão inválida.' },
        { status: 401 }
      ),
    };
  }

  const allowed = adminEmails();

  if (allowed.length === 0) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error:
            'ANAIA_ADMIN_EMAILS não está configurada no servidor.',
        },
        { status: 503 }
      ),
    };
  }

  if (!allowed.includes(user.email.toLowerCase())) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: 'Acesso não autorizado.' },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true as const,
    user,
  };
}

export async function GET() {
  const auth = await requireAdmin();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('orders')
      .select(
        [
          'id',
          'order_number',
          'name',
          'email',
          'company',
          'website',
          'segment',
          'region',
          'competitors',
          'amount',
          'currency',
          'commercial_status',
          'payment_status',
          'mercado_pago_order_id',
          'mercado_pago_status',
          'mercado_pago_status_detail',
          'payment_confirmed_at',
          'delivery_due_at',
          'analysis_started_at',
          'analysis_completed_at',
          'analysis_error',
          'diagnostic_id',
          'delivered_at',
          'confirmation_email_sent_at',
          'source',
          'notes',
          'created_at',
          'updated_at',
        ].join(',')
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Orders list error:', error);

      return NextResponse.json(
        {
          success: false,
          error: 'Não foi possível carregar os pedidos.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orders: data || [],
    });
  } catch (error) {
    console.error('Orders GET unexpected error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Erro inesperado ao carregar os pedidos.',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await request.json();

    const id =
      typeof body?.id === 'string' ? body.id.trim() : '';

    const commercialStatus =
      typeof body?.commercial_status === 'string'
        ? body.commercial_status.trim()
        : '';

    const notes =
      typeof body?.notes === 'string'
        ? body.notes.trim().slice(0, 5000)
        : undefined;

    const diagnosticId =
      body?.diagnostic_id === null
        ? null
        : typeof body?.diagnostic_id === 'string'
        ? body.diagnostic_id.trim()
        : undefined;

    const analysisError =
      body?.analysis_error === null
        ? null
        : typeof body?.analysis_error === 'string'
        ? body.analysis_error.trim().slice(0, 5000)
        : undefined;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Pedido não informado.',
        },
        { status: 400 }
      );
    }

    if (
      commercialStatus &&
      !VALID_STATUSES.has(commercialStatus)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Status comercial inválido.',
        },
        { status: 400 }
      );
    }

    if (
      !commercialStatus &&
      notes === undefined &&
      diagnosticId === undefined &&
      analysisError === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nenhuma alteração foi informada.',
        },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: current, error: currentError } =
      await supabase
        .from('orders')
        .select(
          'id, payment_status, commercial_status, analysis_started_at, analysis_completed_at, delivered_at, diagnostic_id'
        )
        .eq('id', id)
        .maybeSingle();

    if (currentError) {
      console.error('Orders lookup error:', currentError);

      return NextResponse.json(
        {
          success: false,
          error: 'Não foi possível localizar o pedido.',
        },
        { status: 500 }
      );
    }

    if (!current) {
      return NextResponse.json(
        {
          success: false,
          error: 'Pedido não encontrado.',
        },
        { status: 404 }
      );
    }

    const paidOnlyStatuses = new Set([
      'pago',
      'em_analise',
      'entregue',
    ]);

    if (
      commercialStatus &&
      paidOnlyStatuses.has(commercialStatus) &&
      current.payment_status !== 'paid'
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Este status exige pagamento confirmado pelo Mercado Pago.',
        },
        { status: 409 }
      );
    }

    if (
      diagnosticId !== undefined &&
      current.payment_status !== 'paid'
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Não é permitido vincular diagnóstico a pedido sem pagamento confirmado.',
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    const update: Record<string, any> = {
      updated_at: now,
    };

    if (commercialStatus) {
      update.commercial_status = commercialStatus;

      if (
        commercialStatus === 'em_analise' &&
        !current.analysis_started_at
      ) {
        update.analysis_started_at = now;
      }

      if (
        commercialStatus === 'entregue' &&
        !current.delivered_at
      ) {
        update.delivered_at = now;
      }
    }

    if (notes !== undefined) {
      update.notes = notes || null;
    }

    if (analysisError !== undefined) {
      update.analysis_error = analysisError || null;
    }

    if (diagnosticId !== undefined) {
      update.diagnostic_id = diagnosticId || null;

      if (diagnosticId) {
        update.analysis_completed_at = now;
        update.analysis_error = null;
      } else {
        update.analysis_completed_at = null;
      }
    }

    const { data, error } = await supabase
      .from('orders')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Orders update error:', error);

      return NextResponse.json(
        {
          success: false,
          error: 'Não foi possível atualizar o pedido.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      order: data,
    });
  } catch (error) {
    console.error('Orders PATCH unexpected error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Erro inesperado ao atualizar o pedido.',
      },
      { status: 500 }
    );
  }
}
