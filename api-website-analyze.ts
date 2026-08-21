import { NextRequest, NextResponse } from 'next/server';
import { RealWebsiteAnalysisProvider } from '@/lib/providers';

export const runtime = 'nodejs';

/**
 * POST /api/website/analyze
 * Input: { url: string }
 * Returns: WebsiteAnalysis com dados reais
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL é obrigatória' }, { status: 400 });
    }

    const provider = new RealWebsiteAnalysisProvider();
    const analysis = await provider.analyze(url);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Website analysis error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro ao analisar website',
        data_type: 'error',
      },
      { status: 500 }
    );
  }
}
