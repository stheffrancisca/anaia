import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orderId = String(url.searchParams.get('order_id') || '').trim();

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Pedido não informado.',
        },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('orders')
      .select(
        'id, order_number, commercial_status, payment_status, amount, currency, payment_confirmed_at, delivery_due_at'
      )
      .eq('id', orderId)
      .maybeSingle();

    if (error) {
      console.error('Order status error:', error);

      return NextResponse.json(
        {
          success: false,
          error: 'Não foi possível consultar o pedido.',
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Pedido não encontrado.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order: data,
    });
  } catch (error) {
    console.error('Order status route error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao consultar o pedido.',
      },
      { status: 500 }
    );
  }
}
