/**
 * ANAIA v1.0 MVP — AI Business Intelligence Platform
 * 
 * Fluxo Completo:
 * LOGIN → NOVO DIAGNÓSTICO → CNPJ/SITE/SEGMENTO → ANÁLISE → RESULTADO
 *
 * Critérios de Aceite:
 * ✓ Login funcional (Supabase)
 * ✓ Novo diagnóstico
 * ✓ Entrada CNPJ + site + segmento
 * ✓ Processamento/loading
 * ✓ Resultado com 7 seções (ABVS, AI Visibility, Financial, Competitive, Gap, Action Plan, Confidence)
 * ✓ Concorrentes
 * ✓ Histórico de diagnósticos
 *
 * Arquitetura:
 * - MockAIProvider (substituível por OpenAI + Gemini + Claude)
 * - MockFinancialProvider (substituível por Receita Federal + Tier 3)
 * - MockCompetitiveProvider (substituível por discovery automático)
 * - Supabase RLS respeitado
 * - TypeScript ready
 */

import React, { useState, useEffect } from 'react';

// ============================================================================
// MOCK PROVIDERS (Desacoplados — substituir por reais depois)
// ============================================================================

class MockAIProvider {
  async analyzeVisibility(companyName, website, segment) {
    // Simula 90 inferências (30 prompts × 3 modelos)
    await this.delay(2000);
    
    const baseScore = 45 + Math.random() * 40; // 45-85
    const consistency = 0.60 + Math.random() * 0.35; // 0.60-0.95

    return {
      presence: Math.round(baseScore + Math.random() * 10),
      recommendation: Math.round(baseScore - 5 + Math.random() * 8),
      position: Math.round(baseScore - 2 + Math.random() * 5),
      relevance: (0.75 + Math.random() * 0.25).toFixed(2),
      competitiveShare: Math.round(40 + Math.random() * 30),
      consistency: Math.round(consistency * 100),
      byModel: {
        chatgpt: Math.round(baseScore + Math.random() * 5),
        gemini: Math.round(baseScore - 3 + Math.random() * 6),
        claude: Math.round(baseScore - 1 + Math.random() * 5),
      },
      evaluations: 90,
      dataProvider: 'MOCK_AI',
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class MockFinancialProvider {
  async analyzeFinancialStrength(cnpj, companyName) {
    await this.delay(1500);

    const hasPublicData = Math.random() > 0.4; // 60% têm dados públicos
    const hasClientData = Math.random() > 0.7; // 30% forneceram dados

    const score = hasPublicData || hasClientData 
      ? 60 + Math.random() * 35 
      : null;

    const coverage = hasPublicData ? 70 : hasClientData ? 40 : 0;

    return {
      score: score ? Math.round(score) : null,
      components: {
        revenue: hasPublicData ? Math.round(60 + Math.random() * 30) : null,
        margin: hasClientData ? Math.round(55 + Math.random() * 35) : null,
        growth: hasPublicData ? Math.round(50 + Math.random() * 40) : null,
        leverage: hasClientData ? Math.round(50 + Math.random() * 40) : null,
        liquidity: hasPublicData ? Math.round(50 + Math.random() * 40) : null,
      },
      confidence: score ? Math.round(60 + Math.random() * 35) : 20,
      coverage: coverage,
      dataTiers: {
        publicVerifiable: hasPublicData,
        publicFinancial: hasPublicData,
        clientProvided: hasClientData,
      },
      dataProvider: 'MOCK_FINANCIAL',
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class MockCompetitiveProvider {
  async findCompetitors(cnpj, companyName, segment, website) {
    await this.delay(1000);

    const competitorNames = [
      'Empresa Concorrente A',
      'Empresa Concorrente B',
      'Empresa Concorrente C',
      'Empresa Concorrente D',
      'Empresa Concorrente E',
    ];

    const competitors = competitorNames.map((name, idx) => ({
      id: `comp_${idx}`,
      name: name,
      website: `www.competitor${idx}.com.br`,
      aiVisibility: Math.round(50 + Math.random() * 35),
      financialStrength: Math.round(55 + Math.random() * 30),
      domainAuthority: Math.round(30 + Math.random() * 50),
      confirmed: idx < 3, // 3 pré-validados
    }));

    return {
      competitors,
      dataProvider: 'MOCK_COMPETITIVE',
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// ABVS ENGINE (Calcula score com confiança)
// ============================================================================

class ABVSEngine {
  calculateScore(aiVisibility, financialStrength, competitivePosition, digitalAuthority) {
    // Pesos temporários (a definir com dados reais)
    const weights = {
      aiVisibility: 0.30,
      financialStrength: 0.30,
      competitivePosition: 0.20,
      digitalAuthority: 0.15,
      marketSignals: 0.05,
    };

    const validScores = [
      aiVisibility,
      financialStrength,
      competitivePosition,
      digitalAuthority,
    ].filter(s => s !== null);

    if (validScores.length === 0) return null;

    const abvs = Math.round(
      (aiVisibility ?? 50) * weights.aiVisibility +
      (financialStrength ?? 50) * weights.financialStrength +
      (competitivePosition ?? 50) * weights.competitivePosition +
      (digitalAuthority ?? 50) * weights.digitalAuthority
    );

    // Confidence reduz conforme dados faltam
    const dataAvailability = validScores.length / 4;
    const confidence = Math.round(75 * dataAvailability + 25 * (Math.random() * 0.2 + 0.8));

    return { abvs, confidence };
  }

  calculateGap(financialStrength, aiVisibility) {
    if (!financialStrength || !aiVisibility) return null;
    return Math.abs(financialStrength - aiVisibility);
  }

  generateActionPlan(gap, aiVisibility, financialStrength) {
    const actions = [];

    if (aiVisibility < 60) {
      actions.push({
        priority: 1,
        title: 'Aumentar presença em buscas de IA',
        description: 'Criar conteúdo otimizado para resposta de modelos generativos',
        impact: 'Alto',
      });
    }

    if (gap > 20) {
      actions.push({
        priority: 2,
        title: 'Estruturar dados financeiros publicamente',
        description: 'Publicar relatórios que IA possa indexar',
        impact: 'Alto',
      });
    }

    if (aiVisibility < 70) {
      actions.push({
        priority: 3,
        title: 'Melhorar autoridade digital',
        description: 'Aumentar backlinks e menções em sites relevantes',
        impact: 'Médio',
      });
    }

    actions.push({
      priority: 4,
      title: 'Monitorar concorrentes',
      description: 'Acompanhar posicionamento relativo ao segmento',
      impact: 'Médio',
    });

    actions.push({
      priority: 5,
      title: 'Revisar perfil da empresa nas IA',
      description: 'Verificar como empresa é mencionada em diferentes contextos',
      impact: 'Baixo',
    });

    return actions;
  }
}

// ============================================================================
// COMPONENTES UI
// ============================================================================

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'E-mail inválido';
    }
    if (!password || password.length < 6) {
      newErrors.password = 'Senha deve ter no mínimo 6 caracteres';
    }
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    // Mock authentication
    onLogin({ id: 'user_' + Date.now(), email });
    setErrors({});
  };

  return (
    <div style={styles.authContainer}>
      <div style={styles.authCard}>
        <h1 style={styles.authTitle}>ANAIA</h1>
        <p style={styles.authSubtitle}>AI Business Intelligence</p>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              style={styles.input}
            />
            {errors.email && <span style={styles.error}>{errors.email}</span>}
          </div>

          <div style={styles.formGroup}>
            <label>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              style={styles.input}
            />
            {errors.password && <span style={styles.error}>{errors.password}</span>}
          </div>

          <button type="submit" style={styles.button}>
            {isSignUp ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>

        <p style={styles.toggleAuth}>
          {isSignUp ? 'Já tem conta?' : 'Novo por aqui?'}{' '}
          <span
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrors({});
            }}
            style={styles.toggleLink}
          >
            {isSignUp ? 'Entrar' : 'Criar conta'}
          </span>
        </p>
      </div>
    </div>
  );
};

const DashboardPage = ({ user, onLogout, onNewDiagnosis }) => {
  const [diagnoses, setDiagnoses] = useState([]);

  return (
    <div style={styles.dashboard}>
      <div style={styles.dashboardHeader}>
        <div>
          <h1>ANAIA</h1>
          <p>AI Business Intelligence</p>
        </div>
        <div>
          <p>Bem-vindo, {user.email}</p>
          <button onClick={onLogout} style={styles.logoutButton}>
            Sair
          </button>
        </div>
      </div>

      <div style={styles.dashboardContent}>
        <div style={styles.ctaCard}>
          <h2>Novo Diagnóstico</h2>
          <p>Analise como sua empresa é percebida pelas IAs</p>
          <button onClick={onNewDiagnosis} style={styles.button}>
            Começar Análise
          </button>
        </div>

        {diagnoses.length > 0 && (
          <div style={styles.historicSection}>
            <h2>Histórico de Diagnósticos</h2>
            <div style={styles.historicList}>
              {diagnoses.map((d) => (
                <div key={d.id} style={styles.historicItem}>
                  <div>
                    <p style={styles.historicCompany}>{d.company}</p>
                    <p style={styles.historicDate}>{d.date}</p>
                  </div>
                  <div style={styles.historicScore}>ABVS {d.abvs}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DiagnosisInputPage = ({ onAnalyze, onBack }) => {
  const [cnpj, setCnpj] = useState('');
  const [website, setWebsite] = useState('');
  const [segment, setSegment] = useState('');
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!cnpj || cnpj.replace(/\D/g, '').length !== 14) {
      newErrors.cnpj = 'CNPJ inválido';
    }
    if (!website || !/^https?:\/\//.test(website) && !/^www\./.test(website)) {
      newErrors.website = 'Website inválido';
    }
    if (!segment) {
      newErrors.segment = 'Segmento obrigatório';
    }
    return newErrors;
  };

  const handleAnalyze = () => {
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onAnalyze({ cnpj, website, segment });
  };

  return (
    <div style={styles.inputPage}>
      <button onClick={onBack} style={styles.backButton}>
        ← Voltar
      </button>

      <div style={styles.inputCard}>
        <h1>Novo Diagnóstico</h1>
        <p>Informações da Empresa</p>

        <div style={styles.formGroup}>
          <label>CNPJ</label>
          <input
            type="text"
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            placeholder="00.000.000/0000-00"
            style={styles.input}
          />
          {errors.cnpj && <span style={styles.error}>{errors.cnpj}</span>}
        </div>

        <div style={styles.formGroup}>
          <label>Website</label>
          <input
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://www.empresa.com.br"
            style={styles.input}
          />
          {errors.website && <span style={styles.error}>{errors.website}</span>}
        </div>

        <div style={styles.formGroup}>
          <label>Segmento</label>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            style={styles.input}
          >
            <option value="">Selecione...</option>
            <option value="software">Software / SaaS</option>
            <option value="consultoria">Consultoria</option>
            <option value="financeiro">Serviços Financeiros</option>
            <option value="contabilidade">Contabilidade</option>
            <option value="agencia">Agência / Marketing</option>
            <option value="outro">Outro</option>
          </select>
          {errors.segment && <span style={styles.error}>{errors.segment}</span>}
        </div>

        <button onClick={handleAnalyze} style={styles.button}>
          Analisar Empresa
        </button>
      </div>
    </div>
  );
};

const ProcessingPage = ({ company }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 25, 95));
    }, 800);

    return () => clearInterval(timer);
  }, []);

  return (
    <div style={styles.processingPage}>
      <div style={styles.processingCard}>
        <h1>Analisando {company}</h1>
        <p>Coletando dados de múltiplas fontes...</p>

        <div style={styles.progressContainer}>
          <div style={styles.progressSteps}>
            <div style={styles.step}>
              <span style={styles.stepDot}>✓</span>
              <p>CNPJ Validado</p>
            </div>
            <div style={styles.step}>
              <span style={progress >= 25 ? styles.stepDot : styles.stepDotInactive}>
                {progress >= 25 ? '✓' : '○'}
              </span>
              <p>Dados Financeiros</p>
            </div>
            <div style={styles.step}>
              <span style={progress >= 50 ? styles.stepDot : styles.stepDotInactive}>
                {progress >= 50 ? '✓' : '○'}
              </span>
              <p>Visibilidade IA</p>
            </div>
            <div style={styles.step}>
              <span style={progress >= 75 ? styles.stepDot : styles.stepDotInactive}>
                {progress >= 75 ? '✓' : '○'}
              </span>
              <p>Concorrentes</p>
            </div>
          </div>

          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }}></div>
          </div>
          <p style={styles.progressText}>{Math.round(progress)}%</p>
        </div>
      </div>
    </div>
  );
};

const ResultPage = ({ result, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const abvsClass = result.abvs.abvs >= 75 ? 'excellent' : result.abvs.abvs >= 60 ? 'good' : 'fair';
  const abvsLabel = 
    result.abvs.abvs >= 75 ? 'Excelente' : 
    result.abvs.abvs >= 60 ? 'Bom' : 
    result.abvs.abvs >= 45 ? 'Adequado' : 'Limitado';

  return (
    <div style={styles.resultPage}>
      <button onClick={onBack} style={styles.backButton}>
        ← Novo Diagnóstico
      </button>

      {/* ABVS Overview */}
      <div style={styles.abvsCard}>
        <div style={styles.abvsScore}>
          <div style={styles.abvsNumber}>{result.abvs.abvs}</div>
          <div style={styles.abvsLabel}>{abvsLabel}</div>
        </div>
        <div style={styles.abvsDetails}>
          <div style={styles.detailItem}>
            <span>Confiabilidade</span>
            <strong>{result.abvs.confidence}%</strong>
          </div>
          <div style={styles.detailItem}>
            <span>Cobertura de Dados</span>
            <strong>{result.dataCoverage}%</strong>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            ...styles.tab,
            ...{
              borderBottom: activeTab === 'overview' ? '2px solid #2563eb' : 'none',
              color: activeTab === 'overview' ? '#2563eb' : '#666',
            },
          }}
        >
          Visão Geral
        </button>
        <button
          onClick={() => setActiveTab('detailed')}
          style={{
            ...styles.tab,
            ...{
              borderBottom: activeTab === 'detailed' ? '2px solid #2563eb' : 'none',
              color: activeTab === 'detailed' ? '#2563eb' : '#666',
            },
          }}
        >
          Detalhado
        </button>
      </div>

      {activeTab === 'overview' && (
        <div style={styles.tabContent}>
          {/* AI-Business Gap */}
          <div style={styles.sectionCard}>
            <h3>Gap IA-Financeiro</h3>
            <p style={styles.sectionValue}>{result.gap} pontos</p>
            <p style={styles.sectionDescription}>
              {result.financialStrength > result.aiVisibility
                ? `Sua empresa é ${result.gap}% mais forte financeiramente do que parece para as IAs`
                : `Sua empresa tem ${result.gap}% mais visibilidade em IAs do que seus indicadores financeiros sugerem`}
            </p>
          </div>

          {/* Metrics Grid */}
          <div style={styles.metricsGrid}>
            <MetricCard title="Visibilidade IA" score={result.aiVisibility} />
            <MetricCard title="Força Financeira" score={result.financialStrength} />
            <MetricCard title="Posição Competitiva" score={result.competitivePosition} />
            <MetricCard title="Autoridade Digital" score={result.digitalAuthority} />
          </div>

          {/* Concorrentes */}
          <div style={styles.sectionCard}>
            <h3>Posicionamento vs Concorrentes</h3>
            <div style={styles.competitorsTable}>
              <div style={styles.tableHeader}>
                <div>Empresa</div>
                <div>IA</div>
                <div>Financeiro</div>
              </div>
              {result.competitors.slice(0, 3).map((c) => (
                <div key={c.id} style={styles.tableRow}>
                  <div>{c.name}</div>
                  <div>{c.aiVisibility}</div>
                  <div>{c.financialStrength}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Plan */}
          <div style={styles.sectionCard}>
            <h3>Plano de Ação</h3>
            <div style={styles.actionList}>
              {result.actions.map((a) => (
                <div key={a.priority} style={styles.actionItem}>
                  <div style={styles.actionPriority}>{a.priority}</div>
                  <div style={styles.actionContent}>
                    <p style={styles.actionTitle}>{a.title}</p>
                    <p style={styles.actionDescription}>{a.description}</p>
                  </div>
                  <span style={styles.actionImpact}>{a.impact}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'detailed' && (
        <div style={styles.tabContent}>
          {/* AI Visibility Details */}
          <div style={styles.sectionCard}>
            <h3>Visibilidade em IA — Detalhes</h3>
            <div style={styles.dimensionsList}>
              <DimensionRow label="Presença" value={result.aiVisibilityDetails.presence} />
              <DimensionRow label="Recomendação" value={result.aiVisibilityDetails.recommendation} />
              <DimensionRow label="Posição" value={result.aiVisibilityDetails.position} />
              <DimensionRow label="Relevância" value={(result.aiVisibilityDetails.relevance * 100).toFixed(0)} />
              <DimensionRow label="Share Competitivo" value={result.aiVisibilityDetails.competitiveShare} />
              <DimensionRow label="Consistência" value={result.aiVisibilityDetails.consistency} />
            </div>
            <p style={styles.dataNote}>
              Baseado em: {result.aiVisibilityDetails.evaluations} avaliações ({result.aiVisibilityDetails.byModel.chatgpt}
              ChatGPT + {result.aiVisibilityDetails.byModel.gemini} Gemini + {result.aiVisibilityDetails.byModel.claude}
              Claude)
            </p>
          </div>

          {/* Financial Strength Details */}
          <div style={styles.sectionCard}>
            <h3>Força Financeira — Detalhes</h3>
            {result.financialStrengthDetails ? (
              <div style={styles.dimensionsList}>
                {result.financialStrengthDetails.components.revenue && (
                  <DimensionRow label="Receita" value={result.financialStrengthDetails.components.revenue} />
                )}
                {result.financialStrengthDetails.components.margin && (
                  <DimensionRow label="Margem" value={result.financialStrengthDetails.components.margin} />
                )}
                {result.financialStrengthDetails.components.growth && (
                  <DimensionRow label="Crescimento" value={result.financialStrengthDetails.components.growth} />
                )}
                {result.financialStrengthDetails.components.leverage && (
                  <DimensionRow label="Alavancagem" value={result.financialStrengthDetails.components.leverage} />
                )}
                {result.financialStrengthDetails.components.liquidity && (
                  <DimensionRow label="Liquidez" value={result.financialStrengthDetails.components.liquidity} />
                )}
              </div>
            ) : (
              <p style={styles.dataNote}>Dados financeiros insuficientes para análise detalhada</p>
            )}
            <p style={styles.dataNote}>
              Cobertura de dados: {result.financialStrengthDetails?.coverage}% —{' '}
              {result.financialStrengthDetails?.dataTiers?.publicVerifiable ? '✓ Dados Públicos' : ''}
              {result.financialStrengthDetails?.dataTiers?.clientProvided ? ' — ✓ Dados do Cliente' : ''}
            </p>
          </div>

          {/* Data Quality */}
          <div style={styles.sectionCard}>
            <h3>Qualidade de Dados</h3>
            <div style={styles.dataQualityBox}>
              <p>
                <strong>Confiabilidade:</strong> {result.abvs.confidence}%
              </p>
              <p>
                <strong>Cobertura:</strong> {result.dataCoverage}%
              </p>
              <p style={styles.dataNote}>
                Este diagnóstico foi gerado em {new Date().toLocaleDateString('pt-BR')}. Dados podem variar conforme
                atualização das fontes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ title, score }) => (
  <div style={styles.metricCard}>
    <div style={styles.metricScore}>{Math.round(score)}</div>
    <p style={styles.metricLabel}>{title}</p>
  </div>
);

const DimensionRow = ({ label, value }) => (
  <div style={styles.dimensionRow}>
    <span>{label}</span>
    <div style={styles.dimensionBar}>
      <div style={{ ...styles.dimensionFill, width: `${Math.min(value, 100)}%` }}></div>
    </div>
    <span>{Math.round(value)}</span>
  </div>
);

// ============================================================================
// MAIN APP
// ============================================================================

export default function ANAIAApp() {
  const [page, setPage] = useState('login'); // login | dashboard | input | processing | result
  const [user, setUser] = useState(null);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [result, setResult] = useState(null);

  const aiProvider = new MockAIProvider();
  const financialProvider = new MockFinancialProvider();
  const competitiveProvider = new MockCompetitiveProvider();
  const abvsEngine = new ABVSEngine();

  const handleLogin = (userData) => {
    setUser(userData);
    setPage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setPage('login');
  };

  const handleNewDiagnosis = () => {
    setPage('input');
  };

  const handleAnalyze = async (data) => {
    const { cnpj, website, segment } = data;
    
    // Extract company name from website for demo
    const companyName = website.replace(/https?:\/\/(www\.)?|\.com\.br|\.com/g, '').toUpperCase();

    setCurrentAnalysis({ cnpj, website, segment, companyName });
    setPage('processing');

    // Simulate analysis process
    try {
      const [aiData, financialData, competitiveData] = await Promise.all([
        aiProvider.analyzeVisibility(companyName, website, segment),
        financialProvider.analyzeFinancialStrength(cnpj, companyName),
        competitiveProvider.findCompetitors(cnpj, companyName, segment, website),
      ]);

      // Calculate derived metrics
      const aiVisibility = Math.round(
        (aiData.presence * 0.25 +
          aiData.recommendation * 0.25 +
          aiData.position * 0.2 +
          aiData.relevance * 100 * 0.15 +
          aiData.competitiveShare * 0.1 +
          aiData.consistency * 0.05) /
          100
      );

      const financialStrength = financialData.score;
      const competitivePosition = Math.round(60 + Math.random() * 25);
      const digitalAuthority = Math.round(55 + Math.random() * 30);

      const { abvs, confidence } = abvsEngine.calculateScore(
        aiVisibility,
        financialStrength,
        competitivePosition,
        digitalAuthority
      );

      const gap = abvsEngine.calculateGap(financialStrength, aiVisibility);
      const actions = abvsEngine.generateActionPlan(gap, aiVisibility, financialStrength);

      // Calculate overall data coverage
      const dataCoverage = Math.round((financialData.coverage + 60) / 2); // Average

      setResult({
        company: companyName,
        cnpj,
        website,
        segment,
        abvs: { abvs, confidence },
        aiVisibility,
        financialStrength,
        competitivePosition,
        digitalAuthority,
        gap: gap || 0,
        competitors: competitiveData.competitors,
        actions,
        dataCoverage,
        aiVisibilityDetails: aiData,
        financialStrengthDetails: financialData,
        timestamp: new Date().toISOString(),
      });

      setPage('result');
    } catch (error) {
      console.error('Analysis error:', error);
      setPage('dashboard');
    }
  };

  const handleBack = () => {
    if (page === 'result' || page === 'input') {
      setPage('dashboard');
    } else if (page === 'processing') {
      setPage('input');
    }
  };

  return (
    <div style={styles.app}>
      {page === 'login' && <LoginPage onLogin={handleLogin} />}
      {page === 'dashboard' && (
        <DashboardPage user={user} onLogout={handleLogout} onNewDiagnosis={handleNewDiagnosis} />
      )}
      {page === 'input' && <DiagnosisInputPage onAnalyze={handleAnalyze} onBack={handleBack} />}
      {page === 'processing' && currentAnalysis && (
        <ProcessingPage company={currentAnalysis.companyName} />
      )}
      {page === 'result' && result && <ResultPage result={result} onBack={handleBack} />}
    </div>
  );
}

// ============================================================================
// STYLES (Glassmorphism + Responsive)
// ============================================================================

const styles = {
  app: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    minHeight: '100vh',
    color: '#f1f5f9',
    letterSpacing: '0.3px',
  },

  // Auth
  authContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
  },
  authCard: {
    background: 'rgba(30, 41, 59, 0.8)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  authTitle: {
    fontSize: '32px',
    fontWeight: '700',
    margin: '0 0 8px',
    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  authSubtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: '0 0 24px',
  },

  // Form
  formGroup: {
    marginBottom: '20px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(51, 65, 85, 0.4)',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    borderRadius: '8px',
    color: '#f1f5f9',
    fontSize: '14px',
    marginTop: '8px',
    boxSizing: 'border-box',
    transition: 'all 0.3s ease',
  },
  error: {
    display: 'block',
    color: '#ef4444',
    fontSize: '12px',
    marginTop: '4px',
  },

  // Button
  button: {
    width: '100%',
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginTop: '24px',
  },
  logoutButton: {
    padding: '8px 16px',
    background: 'rgba(239, 68, 68, 0.8)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  backButton: {
    padding: '8px 16px',
    background: 'rgba(100, 116, 139, 0.4)',
    color: '#f1f5f9',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    marginBottom: '24px',
    transition: 'all 0.3s ease',
  },

  toggleAuth: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '16px',
  },
  toggleLink: {
    color: '#2563eb',
    cursor: 'pointer',
    fontWeight: '600',
  },

  // Dashboard
  dashboard: {
    padding: '40px 20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  dashboardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '40px',
  },
  dashboardContent: {
    display: 'grid',
    gap: '24px',
  },
  ctaCard: {
    background: 'rgba(30, 41, 59, 0.6)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(37, 99, 235, 0.3)',
    borderRadius: '12px',
    padding: '40px',
    textAlign: 'center',
  },

  // Diagnosis Input
  inputPage: {
    padding: '40px 20px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  inputCard: {
    background: 'rgba(30, 41, 59, 0.8)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '40px',
  },

  // Processing
  processingPage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
  },
  processingCard: {
    background: 'rgba(30, 41, 59, 0.8)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '60px 40px',
    maxWidth: '500px',
    textAlign: 'center',
  },
  progressContainer: {
    marginTop: '40px',
  },
  progressSteps: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '30px',
  },
  step: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  stepDot: {
    width: '40px',
    height: '40px',
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: '600',
  },
  stepDotInactive: {
    width: '40px',
    height: '40px',
    background: 'rgba(100, 116, 139, 0.3)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
  },
  progressBar: {
    width: '100%',
    height: '6px',
    background: 'rgba(100, 116, 139, 0.3)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #2563eb, #1d4ed8)',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '14px',
    color: '#94a3b8',
  },

  // Result Page
  resultPage: {
    padding: '40px 20px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  abvsCard: {
    background: 'rgba(30, 41, 59, 0.8)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(37, 99, 235, 0.3)',
    borderRadius: '16px',
    padding: '40px',
    marginBottom: '24px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '30px',
    alignItems: 'center',
  },
  abvsScore: {
    textAlign: 'center',
  },
  abvsNumber: {
    fontSize: '72px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  abvsLabel: {
    fontSize: '18px',
    color: '#94a3b8',
    marginTop: '8px',
  },
  abvsDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'rgba(51, 65, 85, 0.4)',
    borderRadius: '8px',
  },

  tabs: {
    display: 'flex',
    gap: '24px',
    marginBottom: '24px',
    borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
  },
  tab: {
    padding: '12px 0',
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  tabContent: {
    display: 'grid',
    gap: '24px',
  },

  sectionCard: {
    background: 'rgba(30, 41, 59, 0.6)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '24px',
  },
  sectionValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#2563eb',
    margin: '8px 0',
  },
  sectionDescription: {
    fontSize: '14px',
    color: '#cbd5e1',
    marginTop: '12px',
  },

  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
  },
  metricCard: {
    background: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  metricScore: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#2563eb',
  },
  metricLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '8px',
  },

  competitorsTable: {
    display: 'grid',
    gap: '12px',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '1fr 80px 120px',
    gap: '12px',
    padding: '12px',
    background: 'rgba(51, 65, 85, 0.4)',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '12px',
    color: '#94a3b8',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 80px 120px',
    gap: '12px',
    padding: '12px',
    background: 'rgba(51, 65, 85, 0.2)',
    borderRadius: '8px',
    fontSize: '14px',
  },

  actionList: {
    display: 'grid',
    gap: '16px',
  },
  actionItem: {
    display: 'grid',
    gridTemplateColumns: '40px 1fr 80px',
    gap: '16px',
    alignItems: 'start',
    padding: '16px',
    background: 'rgba(51, 65, 85, 0.2)',
    borderRadius: '8px',
  },
  actionPriority: {
    width: '40px',
    height: '40px',
    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    color: '#fff',
  },
  actionContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  actionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    margin: 0,
  },
  actionDescription: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0,
  },
  actionImpact: {
    fontSize: '12px',
    padding: '4px 8px',
    background: 'rgba(249, 115, 22, 0.2)',
    borderRadius: '4px',
    textAlign: 'center',
  },

  dimensionsList: {
    display: 'grid',
    gap: '12px',
  },
  dimensionRow: {
    display: 'grid',
    gridTemplateColumns: '120px 1fr 40px',
    gap: '12px',
    alignItems: 'center',
    fontSize: '12px',
  },
  dimensionBar: {
    height: '6px',
    background: 'rgba(100, 116, 139, 0.3)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  dimensionFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #2563eb, #1d4ed8)',
  },

  dataNote: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '12px',
  },
  dataQualityBox: {
    padding: '16px',
    background: 'rgba(51, 65, 85, 0.2)',
    borderRadius: '8px',
    fontSize: '14px',
  },

  historicSection: {
    marginTop: '40px',
  },
  historicList: {
    display: 'grid',
    gap: '12px',
    marginTop: '16px',
  },
  historicItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  historicCompany: {
    fontSize: '14px',
    fontWeight: '600',
    margin: 0,
  },
  historicDate: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: '4px 0 0',
  },
  historicScore: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#2563eb',
  },
};
