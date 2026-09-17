import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const PRICE = 500;
const CURRENCY = 'BRL';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, max = 300) {
  return typeof value === 'string'
    ? value.trim().slice(0, max)
    : '';
}

function buildOrderNumber() {
  const date = new Date();
  const datePart = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('');

  const randomPart = randomUUID()
    .replace(/-/g, '')
    .slice(0, 8)
    .toUpperCase();

  return `ANAIA-${datePart}-${randomPart}`;
}

export async function POST(request: Request) {
  const supabase = createSupabaseAdminClient();
  const internalOrderId = randomUUID();
  const orderNumber = buildOrderNumber();

  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const beneficiary =
      process.env.PAYMENT_BENEFICIARY_NAME || 'Beneficiário exibido no checkout';

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            'O checkout ainda não está configurado. Defina MERCADO_PAGO_ACCESS_TOKEN no servidor.',
        },
        { status: 503 }
      );
    }

    const body = await request.json();

    const name = clean(body?.name, 120);
    const email = clean(body?.email, 180).toLowerCase();
    const company = clean(body?.company, 180);
    const website = clean(body?.website, 350);
    const segment = clean(body?.segment, 120);
    const region = clean(body?.region, 140);
    const competitors = clean(body?.competitors, 500);

    if (!name || !email || !company || !website || !segment || !region) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Preencha nome, e-mail, empresa, site, segmento e região.',
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

    const appUrl =
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      new URL(request.url).origin;

    const isPublicHttps =
      appUrl.startsWith('https://') &&
      !appUrl.includes('localhost') &&
      !appUrl.includes('127.0.0.1');

    const successUrl = `${appUrl}/?checkout=success&order_id=${internalOrderId}`;
    const failureUrl = `${appUrl}/?checkout=failure&order_id=${internalOrderId}`;
    const pendingUrl = `${appUrl}/?checkout=pending&order_id=${internalOrderId}`;

    const { error: insertError } = await supabase
      .from('orders')
      .insert({
        id: internalOrderId,
        order_number: orderNumber,
        name,
        email,
        company,
        website,
        segment,
        region,
        competitors: competitors || null,
        amount: PRICE,
        currency: CURRENCY,
        commercial_status: 'interessado',
        payment_status: 'not_started',
        source: 'site_checkout_diagnostico',
      });

    if (insertError) {
      console.error('Order insert error:', insertError);

      return NextResponse.json(
        {
          success: false,
          error: 'Não foi possível registrar o pedido.',
        },
        { status: 500 }
      );
    }

    const mercadoPagoPayload: Record<string, any> = {
      type: 'online',
      processing_mode: 'manual',
      total_amount: PRICE.toFixed(2),
      external_reference: internalOrderId,
      description: 'Diagnóstico assistido de visibilidade em IA — ANAIA',
      payer: {
        email,
      },
      items: [
        {
          title: 'Diagnóstico assistido de visibilidade em IA',
          unit_price: PRICE.toFixed(2),
          quantity: 1,
          unit_measure: 'unit',
          total_amount: PRICE.toFixed(2),
        },
      ],
      config: {
        online: {
          success_url: successUrl,
          failure_url: failureUrl,
          pending_url: pendingUrl,
          auto_return: 'all',
        },
      },
    };

    if (isPublicHttps) {
      mercadoPagoPayload.config.notification_url =
        `${appUrl}/api/webhooks/mercadopago`;
    }

    const mpResponse = await fetch(
      'https://api.mercadopago.com/v1/orders',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Idempotency-Key': internalOrderId,
        },
        body: JSON.stringify(mercadoPagoPayload),
      }
    );

    const mpRaw = await mpResponse.text();

    let mpData: any = null;

    try {
      mpData = mpRaw ? JSON.parse(mpRaw) : null;
    } catch {
      mpData = null;
    }

    if (!mpResponse.ok || !mpData?.id || !mpData?.checkout_url) {
      const mpErrorCode =
        mpData?.code ||
        mpData?.error ||
        mpData?.message ||
        `HTTP_${mpResponse.status}`;

      const mpErrorMessage =
        mpData?.message ||
        mpData?.error ||
        'Falha ao criar checkout no Mercado Pago.';

      console.error('Mercado Pago order error:', {
        status: mpResponse.status,
        code: mpErrorCode,
        message: mpErrorMessage,
        body: mpData || mpRaw,
      });

      await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          notes: `Falha Mercado Pago: ${String(mpErrorCode).slice(0, 120)} | ${String(
            mpErrorMessage
          ).slice(0, 280)}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', internalOrderId);

      return NextResponse.json(
        {
          success: false,
          error:
            'O pedido foi registrado, mas o Mercado Pago recusou a criação do checkout.',
          provider_code: String(mpErrorCode),
        },
        { status: 502 }
      );
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        commercial_status: 'aguardando_pagamento',
        payment_status: 'pending',
        mercado_pago_order_id: mpData.id,
        mercado_pago_status: mpData.status || 'created',
        mercado_pago_status_detail: mpData.status_detail || 'created',
        checkout_url: mpData.checkout_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', internalOrderId);

    if (updateError) {
      console.error('Order checkout update error:', updateError);

      return NextResponse.json(
        {
          success: false,
          error:
            'O checkout foi criado, mas não conseguimos finalizar o registro do pedido.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      order_id: internalOrderId,
      order_number: orderNumber,
      amount: PRICE,
      currency: CURRENCY,
      beneficiary,
      checkout_url: mpData.checkout_url,
    });
  } catch (error) {
    console.error('Create order error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao iniciar a contratação.',
      },
      { status: 500 }
    );
  }
}
