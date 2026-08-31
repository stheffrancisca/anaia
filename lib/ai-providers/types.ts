export type AIProviderName = 'openai' | 'anthropic' | 'gemini';

export interface AIVisibilityDimensions {
  presence: number;
  recommendation: number;
  position: number;
  relevance: number;
  competitive_share: number;
  consistency: number;
}

export interface AIObservation {
  provider: AIProviderName;
  model: string;
  prompt: string;
  response: string;
  presence: number;
  recommendation: number;
  position: number;
  relevance: number;
  competitive_share: number;
  consistency: number;
}

export interface AIProviderResult {
  provider: AIProviderName;
  model: string;
  score: number;
  dimensions: AIVisibilityDimensions;
  observations: AIObservation[];
  observations_count: number;
  success: boolean;
  error?: string;
}

export interface AIAnalysisInput {
  query: string;

  company_name?: string | null;
  website?: string | null;
  cnpj?: string | null;
  segment?: string | null;
  location?: string | null;

  competitors?: string[];

  products_services?: string[];

  country?: string | null;
}

export interface AggregatedAIVisibilityResult {
  score: number | null;

  confidence: number;
  coverage: number;
  cross_model_consistency: number;

  models_requested: number;
  models_available: number;

  providers: {
    openai?: AIProviderResult;
    anthropic?: AIProviderResult;
    gemini?: AIProviderResult;
  };

  dimensions: AIVisibilityDimensions;

  observations_count: number;

  methodology_version: string;
}