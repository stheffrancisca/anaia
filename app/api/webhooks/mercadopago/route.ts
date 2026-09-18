import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

import {
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
} from 'mercadopago';


async function sendConfirmationEmail(params: {
  to: string;
  name: string;
  company: string;
  orderNumber: string;
  deliveryDueAt: string | null;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM_EMAIL ||
    'ANAIA <onboarding@resend.dev>';

  if (!apiKey) {
    return {
      sent: false,
      reason: 'RESEND_API_KEY ausente',
    };
  }

  const deadline = params.deliveryDueAt
    ? new Date(params.deliveryDueAt).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : 'até 48 horas após recebermos os dados necessários';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: `Pagamento confirmado · ${params.orderNumber}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#0f172a">
          <h1 style="font-size:24px">Pagamento confirmado</h1>
          <p>Olá, ${params.name}.</p>
          <p>Recebemos a confirmação do pagamento do diagnóstico assistido da <strong>${params.company}</strong>.</p>

          <div style="padding:16px;border:1px solid #dbeafe;border-radius:12px;background:#f8fbff;margin:20px 0">
            <strong>Pedido:</strong> ${params.orderNumber}<br />
            <strong>Valor:</strong> R$ 500,00<br />
            <strong>Status:</strong> Pago<br />
            <strong>Prazo estimado:</strong> ${deadline}
          </div>

          <h2 style="font-size:17px">Escopo da entrega</h2>
          <ul>
            <li>Análise assistida em 1 ferramenta de IA disponível no momento da execução</li>
            <li>Perguntas utilizadas</li>
            <li>Respostas coletadas e data da análise</li>
            <li>Fontes e referências disponíveis</li>
            <li>Presença da marca e concorrentes encontrados</li>
            <li>Principais gaps e oportunidades</li>
            <li>Relatório executivo</li>
          </ul>

          <p>Se precisarmos de algum dado complementar, entraremos em contato antes de iniciar a contagem final do prazo.</p>
          <p>ANAIA · Apareça na IA</p>
        </div>
      `,
    }),
  });

  const raw = await response.text();

  if (!response.ok) {
    console.error('Resend error:', raw);

    return {
      sent: false,
      reason: raw,
    };
  }

  return {
    sent: true,
  };
}

function plus48HoursIso(date: Date) {
  return new Date(date.getTime() + 48 * 60 * 60 * 1000).toISOString();
}

export async function POST(request: Request) {
  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

    if (!accessToken || !webhookSecret) {
      console.error('Mercado Pago webhook env is incomplete.');

      return NextResponse.json(
        {
          success: false,
        },
        { status: 500 }
      );
    }

    const url = new URL(request.url);

    // IMPORTANTE:
    // Para validar a assinatura, usamos SOMENTE o data.id vindo do query param.
    const queryDataId = String(
      url.searchParams.get('data.id') ||
      url.searchParams.get('id') ||
      ''
    ).trim();

    let body: any = null;

    try {
      body = await request.json();
    } catch {
      body = null;
    }

    // Para consultar a Order depois da validação, podemos usar query param
    // ou, se o simulador não o enviar, o data.id do body.
    const resourceDataId = String(
      queryDataId ||
      body?.data?.id ||
      ''
    ).trim();

    const xSignature =
      request.headers.get('x-signature') || '';
    const xRequestId =
      request.headers.get('x-request-id') || '';

    try {
      WebhookSignatureValidator.validate({
        xSignature,
        xRequestId,
        dataId: queryDataId,
        secret: webhookSecret.trim(),
      });
    } catch (error) {
      if (error instanceof InvalidWebhookSignatureError) {
        console.error('Invalid Mercado Pago webhook signature (SDK).', {
          requestUrl: request.url,
          queryDataId: queryDataId || null,
          hasRequestId: Boolean(xRequestId),
          hasSignature: Boolean(xSignature),
          secretLength: webhookSecret.trim().length,
          eventType: body?.type || null,
          action: body?.action || null,
          liveMode: body?.live_mode ?? null,
        });

        return NextResponse.json(
          {
            success: false,
            error: 'invalid_webhook_signature',
          },
          { status: 401 }
        );
      }

      console.error('Mercado Pago webhook validator unexpected error:', error);

      return NextResponse.json(
        {
          success: false,
          error: 'webhook_validator_error',
        },
        { status: 500 }
      );
    }

    if (!resourceDataId) {
      console.error('Mercado Pago webhook without resource id.');

      return NextResponse.json(
        {
          success: false,
        },
        { status: 400 }
      );
    }

    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/orders/${encodeURIComponent(resourceDataId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    );

    const mpRaw = await mpResponse.text();

    let mpOrder: any = null;

    try {
      mpOrder = mpRaw ? JSON.parse(mpRaw) : null;
    } catch {
      mpOrder = null;
    }

    if (!mpResponse.ok || !mpOrder?.id) {
      console.error('Could not fetch Mercado Pago order:', {
        status: mpResponse.status,
        body: mpOrder || mpRaw,
      });

      return NextResponse.json(
        {
          success: false,
        },
        { status: 502 }
      );
    }

    const localOrderId = String(
      mpOrder.external_reference || ''
    ).trim();

    if (!localOrderId) {
      return NextResponse.json({ success: true });
    }

    const supabase = createSupabaseAdminClient();

    const { data: localOrder, error: localOrderError } =
      await supabase
        .from('orders')
        .select(
          'id, order_number, name, email, company, amount, payment_status, confirmation_email_sent_at'
        )
        .eq('id', localOrderId)
        .maybeSingle();

    if (localOrderError) {
      console.error('Local order lookup error:', localOrderError);

      return NextResponse.json(
        {
          success: false,
        },
        { status: 500 }
      );
    }

    if (!localOrder) {
      return NextResponse.json({ success: true });
    }

    const amountExpected = Number(localOrder.amount || 0);
    const amountPaid = Number(mpOrder.total_paid_amount || 0);
    const status = String(mpOrder.status || '');
    const statusDetail = String(mpOrder.status_detail || '');

    const approved =
      status === 'processed' &&
      statusDetail === 'accredited' &&
      amountPaid >= amountExpected;

    const now = new Date();
    const update: Record<string, any> = {
      mercado_pago_order_id: mpOrder.id,
      mercado_pago_status: status || null,
      mercado_pago_status_detail: statusDetail || null,
      updated_at: now.toISOString(),
    };

    if (approved) {
      update.payment_status = 'paid';
      update.commercial_status = 'pago';

      if (localOrder.payment_status !== 'paid') {
        update.payment_confirmed_at = now.toISOString();
        update.delivery_due_at = plus48HoursIso(now);
      }
    } else if (status === 'failed' || status === 'canceled') {
      update.payment_status = 'failed';
      update.commercial_status = 'aguardando_pagamento';
    } else if (
      status === 'processed' &&
      statusDetail === 'refunded'
    ) {
      update.payment_status = 'refunded';
    } else if (
      status === 'processed' &&
      statusDetail === 'partially_refunded'
    ) {
      update.payment_status = 'partially_refunded';
    } else {
      update.payment_status = 'pending';
      update.commercial_status = 'aguardando_pagamento';
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(update)
      .eq('id', localOrderId);

    if (updateError) {
      console.error('Order payment update error:', updateError);

      return NextResponse.json(
        {
          success: false,
        },
        { status: 500 }
      );
    }

    if (
      approved &&
      !localOrder.confirmation_email_sent_at
    ) {
      const deliveryDueAt =
        update.delivery_due_at || null;

      const emailResult = await sendConfirmationEmail({
        to: localOrder.email,
        name: localOrder.name,
        company: localOrder.company,
        orderNumber: localOrder.order_number,
        deliveryDueAt,
      });

      if (emailResult.sent) {
        await supabase
          .from('orders')
          .update({
            confirmation_email_sent_at:
              new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', localOrderId);
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Mercado Pago webhook error:', error);

    return NextResponse.json(
      {
        success: false,
      },
      { status: 500 }
    );
  }
}
