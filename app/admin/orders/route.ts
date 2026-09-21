import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const ALLOWED_STATUSES = new Set([
  'interessado',
  'proposta_enviada',
  'aguardando_pagamento',
  'pago',
  'em_analise',
  'entregue',
]);

function clean(value: unknown, max = 2000) {
  return typeof value === 'string'
    ? value.trim().slice(0, max)
    : '';
}

async function requireAdmin() {
  const accessToken =
    cookies().get('anaia_access_token')?.value || '';

  if (!accessToken) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: 'Sessão não autenticada.',
        },
        { status: 401 }
      ),
    };
  }

  const authClient = createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(accessToken);

  if (error || !user?.email) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: 'Sessão inválida.',
        },
        { status: 401 }
      ),
    };
  }

  const adminEmail = String(
    process.env.ADMIN_EMAIL || ''
  )
    .trim()
    .toLowerCase();

  if (!adminEmail) {
    console.error('ADMIN_EMAIL não está configurado.');

    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: 'Área administrativa não configurada.',
        },
        { status: 503 }
      ),
    };
  }

  if (user.email.toLowerCase() !== adminEmail) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: 'Acesso restrito ao administrador.',
        },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true as const,
    user,
  };
}

const ORDER_SELECT = `
  id,
  order_number,
  name,
  email,
  company,
  website,
  segment,
  region,
  competitors,
  amount,
  currency,
  commercial_status,
  payment_status,
  mercado_pago_order_id,
  mercado_pago_status,
  mercado_pago_status_detail,
  checkout_url,
  payment_confirmed_at,
  delivery_due_at,
  analysis_started_at,
  delivered_at,
  confirmation_email_sent_at,
  notes,
  created_at,
  updated_at
`;

export async function GET() {
  const auth = await requireAdmin();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .order('created_at', {
        ascending: false,
      })
      .limit(250);

    if (error) {
      console.error('Admin orders list error:', error);

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
      count: data?.length || 0,
      orders: data || [],
    });
  } catch (error) {
    console.error('Admin orders GET error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao carregar pedidos.',
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

    const id = clean(body?.id, 100);
    const status = clean(body?.status, 80);
    const notes =
      typeof body?.notes === 'string'
        ? body.notes.trim().slice(0, 4000)
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

    if (!status && notes === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nenhuma alteração foi informada.',
        },
        { status: 400 }
      );
    }

    if (status && !ALLOWED_STATUSES.has(status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Status comercial inválido.',
        },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: currentOrder, error: currentError } =
      await supabase
        .from('orders')
        .select(
          'id, payment_status, commercial_status, analysis_started_at, delivered_at'
        )
        .eq('id', id)
        .maybeSingle();

    if (currentError) {
      console.error('Admin order lookup error:', currentError);

      return NextResponse.json(
        {
          success: false,
          error: 'Não foi possível localizar o pedido.',
        },
        { status: 500 }
      );
    }

    if (!currentOrder) {
      return NextResponse.json(
        {
          success: false,
          error: 'Pedido não encontrado.',
        },
        { status: 404 }
      );
    }

    if (
      status &&
      ['pago', 'em_analise', 'entregue'].includes(status) &&
      currentOrder.payment_status !== 'paid'
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Esse pedido ainda não possui pagamento confirmado pelo Mercado Pago.',
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const update: Record<string, any> = {
      updated_at: now,
    };

    if (notes !== undefined) {
      update.notes = notes || null;
    }

    if (status) {
      update.commercial_status = status;

      if (
        status === 'em_analise' &&
        !currentOrder.analysis_started_at
      ) {
        update.analysis_started_at = now;
      }

      if (
        status === 'entregue' &&
        !currentOrder.delivered_at
      ) {
        update.delivered_at = now;
      }
    }

    const { data: updatedOrder, error: updateError } =
      await supabase
        .from('orders')
        .update(update)
        .eq('id', id)
        .select(ORDER_SELECT)
        .single();

    if (updateError) {
      console.error('Admin order update error:', updateError);

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
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Admin orders PATCH error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao atualizar pedido.',
      },
      { status: 500 }
    );
  }
}
