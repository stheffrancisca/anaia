// ============================================================================
// ABVS CONFIG (Configurável)
// ============================================================================

export const ABVS_CONFIG = {
  weights: {
    ai_visibility: 0.40,
    financial_strength: 0.30,
    digital_authority: 0.15,
    competitive_position: 0.15,
  },
  methodology_version: '1.0',
};

// ============================================================================
// FINANCIAL STRENGTH CALCULATOR
// ============================================================================

export interface FinancialInputs {
  revenue?: number;
  revenue_previous_period?: number;
  ebitda?: number;
  debt?: number;
}

export interface FinancialStrengthResult {
  score: number | null;
  confidence: number;
  coverage: number;
  components: {
    revenue: number | null;
    growth: number | null;
    margin: number | null;
    leverage: number | null;
  };
  data_type: string[];
  interpretation: string;
}

export class FinancialStrengthCalculator {
  calculate(inputs: FinancialInputs): FinancialStrengthResult {
    const usedDataPoints = [];
    const scores = [];

    // Revenue score
    let revenueScore = null;
    if (inputs.revenue) {
      usedDataPoints.push('revenue');
      // Normalize: small business (1M) = 40, large (100M+) = 90
      revenueScore = Math.min(90, 40 + Math.log10(inputs.revenue / 1000000) * 20);
      scores.push(revenueScore);
    }

    // Growth score
    let growthScore = null;
    if (inputs.revenue && inputs.revenue_previous_period) {
      usedDataPoints.push('growth');
      const growth = ((inputs.revenue - inputs.revenue_previous_period) / inputs.revenue_previous_period) * 100;
      // High growth (100%+) = 90, zero/negative = 30
      growthScore = Math.min(90, Math.max(30, 50 + growth / 2));
      scores.push(growthScore);
    }

    // Margin score
    let marginScore = null;
    if (inputs.ebitda && inputs.revenue) {
      usedDataPoints.push('margin');
      const margin = (inputs.ebitda / inputs.revenue) * 100;
      // 30% margin = 80, 5% = 40
      marginScore = Math.min(90, 30 + margin * 1.5);
      scores.push(marginScore);
    }

    // Leverage score (debt to EBITDA)
    let leverageScore = null;
    if (inputs.debt && inputs.ebitda) {
      usedDataPoints.push('leverage');
      const leverage = inputs.debt / inputs.ebitda;
      // 0x = 90, 3x = 50, 5x+ = 30
      leverageScore = Math.min(90, Math.max(30, 90 - leverage * 20));
      scores.push(leverageScore);
    }

    // Calculate composite score
    const score = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : null;

    // Calculate confidence based on data points
    const maxDataPoints = 4;
    const confidence = Math.round((usedDataPoints.length / maxDataPoints) * 100);

    // Calculate coverage percentage
    const coverage = Math.round((usedDataPoints.length / maxDataPoints) * 100);

    return {
      score,
      confidence,
      coverage,
      components: {
        revenue: revenueScore,
        growth: growthScore,
        margin: marginScore,
        leverage: leverageScore,
      },
      data_type: usedDataPoints,
      interpretation:
        score === null
          ? 'Dados financeiros insuficientes para cálculo'
          : score >= 75
          ? 'Força financeira excelente'
          : score >= 60
          ? 'Força financeira adequada'
          : 'Força financeira limitada',
    };
  }
}

// ============================================================================
// AI VISIBILITY CALCULATOR
// ============================================================================

export interface AIObservationData {
  presence: number; // 0-100
  recommendation: number; // 0-100
  position: number; // 0-100
  relevance: number; // 0-1
  competitive_share: number; // 0-100
}

export interface AIVisibilityResult {
  score: number;
  confidence: number;
  observations_count: number;
  dimensions: {
    presence: number;
    recommendation: number;
    position: number;
    relevance: number;
    competitive_share: number;
    consistency: number;
  };
}

export class AIVisibilityCalculator {
  calculate(observations: AIObservationData[]): AIVisibilityResult {
    if (observations.length === 0) {
      return {
        score: 0,
        confidence: 0,
        observations_count: 0,
        dimensions: {
          presence: 0,
          recommendation: 0,
          position: 0,
          relevance: 0,
          competitive_share: 0,
          consistency: 0,
        },
      };
    }

    // Average each dimension
    const avgPresence = observations.reduce((s, o) => s + o.presence, 0) / observations.length;
    const avgRecommendation = observations.reduce((s, o) => s + o.recommendation, 0) / observations.length;
    const avgPosition = observations.reduce((s, o) => s + o.position, 0) / observations.length;
    const avgRelevance = observations.reduce((s, o) => s + o.relevance, 0) / observations.length;
    const avgCompetitiveShare = observations.reduce((s, o) => s + o.competitive_share, 0) / observations.length;

    // Consistency = std deviation (lower variance = higher consistency)
    const avgScore =
      avgPresence * 0.25 + avgRecommendation * 0.25 + avgPosition * 0.2 + avgRelevance * 100 * 0.15 + avgCompetitiveShare * 0.1;

    const variance =
      observations.reduce((sum, o) => {
        const obsScore = o.presence * 0.25 + o.recommendation * 0.25 + o.position * 0.2 + o.relevance * 100 * 0.15 + o.competitive_share * 0.1;
        return sum + Math.pow(obsScore - avgScore, 2);
      }, 0) / observations.length;

    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0, 100 - stdDev * 2); // Higher std = lower consistency

    // Confidence increases with number of observations
    const confidence = Math.min(95, 50 + observations.length * 5);

    return {
      score: Math.round(avgScore),
      confidence: Math.round(confidence),
      observations_count: observations.length,
      dimensions: {
        presence: Math.round(avgPresence),
        recommendation: Math.round(avgRecommendation),
        position: Math.round(avgPosition),
        relevance: parseFloat(avgRelevance.toFixed(2)),
        competitive_share: Math.round(avgCompetitiveShare),
        consistency: Math.round(consistency),
      },
    };
  }
}

// ============================================================================
// ABVS ENGINE
// ============================================================================

export interface ABVSInput {
  aiVisibility: number | null;
  financialStrength: number | null;
  competitivePosition: number | null;
  digitalAuthority: number | null;
}

export interface ABVSResult {
  score: number | null;
  confidence: number;
  coverage: number;
  components: {
    ai_visibility: number | null;
    financial_strength: number | null;
    competitive_position: number | null;
    digital_authority: number | null;
  };
  interpretation: string;
  methodology_version: string;
}

export class ABVSEngine {
  calculate(input: ABVSInput): ABVSResult {
    const availableComponents = [
      { key: 'ai_visibility', value: input.aiVisibility },
      { key: 'financial_strength', value: input.financialStrength },
      { key: 'competitive_position', value: input.competitivePosition },
      { key: 'digital_authority', value: input.digitalAuthority },
    ];

    const validComponents = availableComponents.filter((c) => c.value !== null);

    if (validComponents.length === 0) {
      return {
        score: null,
        confidence: 10,
        coverage: 0,
        components: {
          ai_visibility: input.aiVisibility,
          financial_strength: input.financialStrength,
          competitive_position: input.competitivePosition,
          digital_authority: input.digitalAuthority,
        },
        interpretation: 'Dados insuficientes para calcular ABVS',
        methodology_version: ABVS_CONFIG.methodology_version,
      };
    }

    // Recalculate weights for available components only
    const recalculatedWeights: { [key: string]: number } = {};
    const totalWeight = validComponents.reduce((sum, c) => sum + ABVS_CONFIG.weights[c.key as keyof typeof ABVS_CONFIG.weights], 0);

    for (const component of validComponents) {
      const originalWeight = ABVS_CONFIG.weights[component.key as keyof typeof ABVS_CONFIG.weights];
      recalculatedWeights[component.key] = originalWeight / totalWeight;
    }

    // Calculate weighted score
    let score = 0;
    for (const component of validComponents) {
      score += (component.value || 0) * recalculatedWeights[component.key];
    }

    // Confidence reduces with missing components
    const baseConfidence = 80;
    const componentCount = Object.keys(ABVS_CONFIG.weights).length;
    const confidence = Math.round((baseConfidence * validComponents.length) / componentCount);

    // Coverage
    const coverage = Math.round((validComponents.length / componentCount) * 100);

    // Interpretation
    const roundedScore = Math.round(score);
    let interpretation = '';
    if (roundedScore >= 80) interpretation = 'ABVS Excelente';
    else if (roundedScore >= 65) interpretation = 'ABVS Bom';
    else if (roundedScore >= 50) interpretation = 'ABVS Adequado';
    else interpretation = 'ABVS Limitado';

    if (validComponents.length < componentCount) {
      interpretation += ` (baseado em ${validComponents.length}/${componentCount} componentes)`;
    }

    return {
      score: Math.round(score),
      confidence,
      coverage,
      components: {
        ai_visibility: input.aiVisibility,
        financial_strength: input.financialStrength,
        competitive_position: input.competitivePosition,
        digital_authority: input.digitalAuthority,
      },
      interpretation,
      methodology_version: ABVS_CONFIG.methodology_version,
    };
  }
}

// ============================================================================
// GAP CALCULATOR
// ============================================================================

export interface GapResult {
  gap: number | null;
  interpretation: string;
  is_available: boolean;
}

export class GapCalculator {
  calculate(financialStrength: number | null, aiVisibility: number | null): GapResult {
    if (financialStrength === null || aiVisibility === null) {
      return {
        gap: null,
        interpretation: 'Dados insuficientes para calcular gap',
        is_available: false,
      };
    }

    const gap = financialStrength - aiVisibility;

    let interpretation = '';
    if (gap > 20) {
      interpretation = `Sua empresa é ${Math.abs(gap)}% mais forte financeiramente do que parece para as IAs. Oportunidade de aumentar visibilidade.`;
    } else if (gap < -20) {
      interpretation = `Sua empresa tem ${Math.abs(gap)}% mais visibilidade em IAs do que seus indicadores financeiros sugerem. Validar força real.`;
    } else {
      interpretation = 'Percepção das IAs alinhada com indicadores financeiros';
    }

    return {
      gap: Math.abs(gap),
      interpretation,
      is_available: true,
    };
  }
}

// ============================================================================
// ACTION PLAN GENERATOR
// ============================================================================

export interface ActionPlan {
  priority: number;
  title: string;
  description: string;
  impact: string;
  category: string;
}

export class ActionPlanGenerator {
  generate(
    aiVisibility: number | null,
    financialStrength: number | null,
    gap: number | null,
    dataAvailable: boolean
  ): ActionPlan[] {
    const actions: ActionPlan[] = [];
    let priority = 1;

    // AI Visibility issues
    if (aiVisibility && aiVisibility < 60) {
      actions.push({
        priority: priority++,
        title: 'Aumentar Presença em Buscas de IA',
        description: 'Criar conteúdo otimizado para respostas de modelos generativos com foco no seu segmento',
        impact: 'Alto',
        category: 'AI Visibility',
      });
    }

    // Financial data missing
    if (!dataAvailable || financialStrength === null) {
      actions.push({
        priority: priority++,
        title: 'Estruturar Dados Financeiros',
        description: 'Documentar e publicar indicadores financeiros que IAs possam indexar',
        impact: 'Alto',
        category: 'Financial Strength',
      });
    }

    // Large gap
    if (gap && gap > 20) {
      actions.push({
        priority: priority++,
        title: 'Estratégia de Visibilidade Digital',
        description: 'Implementar plano de conteúdo e autoridade para ampliar reconhecimento em IAs',
        impact: 'Médio',
        category: 'Digital Authority',
      });
    }

    // Competitive positioning
    if (!aiVisibility || aiVisibility < 75) {
      actions.push({
        priority: priority++,
        title: 'Análise de Competidores',
        description: 'Estudar como concorrentes aparecem em buscas de IA e adaptar estratégia',
        impact: 'Médio',
        category: 'Competitive Position',
      });
    }

    // Monitoring
    actions.push({
      priority: priority++,
      title: 'Monitorar Evolução',
      description: 'Acompanhar mensalmente como percepção das IAs evolui com as ações implementadas',
      impact: 'Médio',
      category: 'Monitoring',
    });

    return actions;
  }
}
