import { NextRequest, NextResponse } from 'next/server';
import { RealCompanyDataProvider } from '@/lib/providers';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * POST /api/company/lookup
 * Input: { cnpj: string }
 * Returns: CompanyData com dados reais ou erro
 */
export async function POST(request: NextRequest) {
  try {
    const { cnpj } = await request.json();

    if (!cnpj) {
      return NextResponse.json({ error: 'CNPJ é obrigatório' }, { status: 400 });
    }

    // Lookup real data
    const provider = new RealCompanyDataProvider();
    const companyData = await provider.lookup(cnpj);

    // Opcionalmente, salvar no Supabase (requer autenticação)
    // const authHeader = request.headers.get('authorization');
    // if (authHeader) {
    //   const token = authHeader.replace('Bearer ', '');
    //   const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    //   if (user) {
    //     await supabaseAdmin.from('companies').insert([{
    //       user_id: user.id,
    //       cnpj: companyData.cnpj,
    //       company_name: companyData.company_name,
    //       status: companyData.status,
    //       // ... outros campos
    //     }]);
    //   }
    // }

    return NextResponse.json(companyData);
  } catch (error) {
    console.error('Company lookup error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro ao buscar dados da empresa',
      },
      { status: 500 }
    );
  }
}
