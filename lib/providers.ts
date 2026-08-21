import axios from 'axios';
import * as cheerio from 'cheerio';

// ============================================================================
// COMPANY DATA PROVIDER
// ============================================================================

export interface CompanyData {
  cnpj: string;
  company_name: string | null;
  status: string | null;
  opening_date: string | null;
  legal_nature: string | null;
  company_size: string | null;
  primary_cnae: string | null;
  secondary_cnaes: string[] | null;
  capital_social: number | null;
  address: string | null;
  state: string | null;
  data_type: 'real' | 'mock' | 'user_provided';
  source: string;
  observed_at: string;
}

export interface ICompanyDataProvider {
  lookup(cnpj: string): Promise<CompanyData>;
}

/**
 * Real company data from public CNPJ database
 * Uses: Minha Receita API (free, public)
 */
export class RealCompanyDataProvider implements ICompanyDataProvider {
  async lookup(cnpj: string): Promise<CompanyData> {
    try {
      const cleanCnpj = cnpj.replace(/\D/g, '');

      if (cleanCnpj.length !== 14) {
        throw new Error('CNPJ inválido');
      }

      // Usar API pública: https://receitaws.com.br
      const response = await axios.get(
        `https://receitaws.com.br/v1/cnpj/${cleanCnpj}`,
        { timeout: 10000 }
      );

      if (response.data.status === 'ERROR') {
        throw new Error('CNPJ não encontrado');
      }

      return {
        cnpj: cleanCnpj,
        company_name: response.data.nome || null,
        status: response.data.situacao || null,
        opening_date: response.data.abertura || null,
        legal_nature: response.data.natureza_juridica || null,
        company_size: this.mapCompanySize(response.data.capital_social),
        primary_cnae: response.data.atividade?.[0]?.code || null,
        secondary_cnaes: response.data.atividade?.slice(1).map((a: any) => a.code) || null,
        capital_social: response.data.capital_social ? parseInt(response.data.capital_social) : null,
        address: this.formatAddress(response.data),
        state: response.data.uf || null,
        data_type: 'real',
        source: 'receita_ws_public_api',
        observed_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error('CompanyDataProvider error:', error);
      throw error;
    }
  }

  private mapCompanySize(capitalSocial?: number): string | null {
    if (!capitalSocial) return null;
    if (capitalSocial < 360000) return 'Microempresa';
    if (capitalSocial < 4800000) return 'Pequena Empresa';
    if (capitalSocial < 48000000) return 'Média Empresa';
    return 'Grande Empresa';
  }

  private formatAddress(data: any): string | null {
    if (!data.logradouro) return null;
    return `${data.logradouro}, ${data.numero || 'S/N'} - ${data.municipio}, ${data.uf}`;
  }
}

// ============================================================================
// WEBSITE ANALYSIS PROVIDER
// ============================================================================

export interface WebsiteAnalysis {
  url: string;
  title: string | null;
  description: string | null;
  h1: string | null;
  h2: string[] | null;
  word_count: number;
  pages_detected: number;
  has_contact_info: boolean;
  has_about: boolean;
  has_products: boolean;
  structured_data: any | null;
  data_type: 'real' | 'mock';
  analyzed_at: string;
  source: string;
}

export interface IWebsiteAnalysisProvider {
  analyze(url: string): Promise<WebsiteAnalysis>;
}

/**
 * Real website crawling using cheerio
 */
export class RealWebsiteAnalysisProvider implements IWebsiteAnalysisProvider {
  async analyze(url: string): Promise<WebsiteAnalysis> {
    try {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;

      const response = await axios.get(fullUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ANAIA/1.0)',
        },
      });

      const $ = cheerio.load(response.data);

      // Extract structured data
      const schemaElement = $('script[type="application/ld+json"]').first();
      let structuredData = null;
      try {
        if (schemaElement.length > 0) {
          structuredData = JSON.parse(schemaElement.html() || '{}');
        }
      } catch (e) {
        // Structured data parsing failed, continue
      }

      // Extract data
      const title = $('title').text() || $('meta[property="og:title"]').attr('content') || null;
      const description =
        $('meta[name="description"]').attr('content') ||
        $('meta[property="og:description"]').attr('content') ||
        null;

      const h1 = $('h1').first().text() || null;
      const h2Array = $('h2').map((_, el) => $(el).text()).get() || null;

      const bodyText = $('body').text() || '';
      const wordCount = bodyText.trim().split(/\s+/).length;

      const hasContactInfo =
        $('a[href*="mailto:"]').length > 0 ||
        $('input[type="email"]').length > 0 ||
        /contato|contact|email|whatsapp|telefone/i.test(bodyText);

      const hasAbout =
        $('a[href*="/about"]').length > 0 ||
        $('a[href*="/sobre"]').length > 0 ||
        /sobre a empresa|quem somos|about us/i.test(bodyText);

      const hasProducts =
        $('a[href*="/product"]').length > 0 ||
        $('a[href*="/produtos"]').length > 0 ||
        /produto|product|solução|service/i.test(bodyText);

      return {
        url: fullUrl,
        title,
        description,
        h1,
        h2: h2Array && h2Array.length > 0 ? h2Array : null,
        word_count: wordCount,
        pages_detected: 1, // Would need sitemap to detect more
        has_contact_info: hasContactInfo,
        has_about: hasAbout,
        has_products: hasProducts,
        structured_data: structuredData,
        data_type: 'real',
        analyzed_at: new Date().toISOString(),
        source: 'web_crawler',
      };
    } catch (error) {
      console.error('WebsiteAnalysisProvider error:', error);
      throw error;
    }
  }
}

// ============================================================================
// AI VISIBILITY PROVIDER
// ============================================================================

export interface AIObservation {
  prompt: string;
  response: string;
  presence: number; // 0-100
  recommendation: number; // 0-100
  position: number; // 0-100
  relevance: number; // 0-1
  competitive_share: number; // 0-100
}

export interface IAIVisibilityProvider {
  analyze(
    company: string,
    website: string,
    segment: string,
    competitors: string[]
  ): Promise<AIObservation[]>;
}

/**
 * NOT_CONFIGURED marker for missing integration
 */
export class NotConfiguredAIVisibilityProvider implements IAIVisibilityProvider {
  async analyze(): Promise<AIObservation[]> {
    throw new Error(
      'OpenAI não configurado. Configure OPENAI_API_KEY no .env'
    );
  }
}

/**
 * Real AI visibility using OpenAI
 * Implemented in API route to keep key secure
 */
export class RealAIVisibilityProvider implements IAIVisibilityProvider {
  async analyze(): Promise<AIObservation[]> {
    // This will be called from backend API route
    // Frontend should never call this directly
    throw new Error('Debe ser llamado desde el servidor');
  }
}
