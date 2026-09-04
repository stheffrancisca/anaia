'use client';

import React, { useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface User {
  id: string;
  email: string;
}

interface DiagnosticResult {
  company: any;
  website: any;
  financial: any;
  ai_visibility: any;
  benchmark?: any;
  competitive_position: number;
  digital_authority: number;
  abvs: any;
  gap: any;
  actions: any[];
  data_quality: any;
  request_context?: {
    intent?: string | null;
    data_sources?: string[];
    confidence?: number;
    competitors?: string[];
    query?: string;
    segment?: string;
    location?: string;
  };
  timestamp: string;
}

type Page = 'login' | 'signup' | 'dashboard' | 'input' | 'processing' | 'result';

// ============================================================================
// COMPONENTS
// ============================================================================

const LoginPage: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSignUp, setIsSignUp] = useState(false);

  const authenticate = async () => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok || !data?.success || !data?.user) {
      throw new Error(data?.error || 'Não foi possível realizar o login.');
    }

    onLogin({
      id: data.user.id,
      email: data.user.email || email,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { [key: string]: string } = {};

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'E-mail inválido';
    }

    if (!password || password.length < 6) {
      newErrors.password = 'Senha deve ter no mínimo 6 caracteres';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      if (isSignUp) {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok || !data?.success) {
          throw new Error(data?.error || 'Erro ao criar conta.');
        }

        if (data.requires_email_confirmation) {
          alert('Conta criada. Verifique seu e-mail para confirmar o cadastro.');
          setIsSignUp(false);
          setPassword('');
          return;
        }

        // O signup pode criar uma sessão no Supabase, mas o cookie HTTP-only
        // do ANAIA é estabelecido pela nossa rota server-side de login.
        await authenticate();
        return;
      }

      await authenticate();
    } catch (error) {
      setErrors({
        auth: error instanceof Error ? error.message : 'Erro de autenticação',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.authContainer}>
      <div style={styles.authCard}>
        <h1 style={styles.authTitle}>ANAIA</h1>
        <p style={styles.authSubtitle}>AI Business Intelligence Platform</p>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email || errors.auth) {
                  setErrors((current) => ({ ...current, email: '', auth: '' }));
                }
              }}
              placeholder="seu@email.com"
              style={styles.input}
              disabled={loading}
              autoComplete="email"
            />
            {errors.email && <span style={styles.error}>{errors.email}</span>}
          </div>

          <div style={styles.formGroup}>
            <label>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password || errors.auth) {
                  setErrors((current) => ({ ...current, password: '', auth: '' }));
                }
              }}
              placeholder="Mínimo 6 caracteres"
              style={styles.input}
              disabled={loading}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
            {errors.password && <span style={styles.error}>{errors.password}</span>}
          </div>

          {errors.auth && <span style={styles.error}>{errors.auth}</span>}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Processando...' : isSignUp ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>

        <p style={styles.toggleAuth}>
          {isSignUp ? 'Já tem conta?' : 'Novo por aqui?'}{' '}
          <span
            onClick={() => {
              if (!loading) {
                setIsSignUp(!isSignUp);
                setErrors({});
              }
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

const DashboardPage: React.FC<{
  user: User;
  onLogout: () => void;
  onNewDiagnosis: () => void;
}> = ({ user, onLogout, onNewDiagnosis }) => {
  return (
    <div style={styles.dashboard}>
      <div style={styles.dashboardHeader}>
        <div>
          <h1>ANAIA</h1>
          <p>AI Business Intelligence Platform</p>
        </div>
        <div style={styles.userSection}>
          <p>{user.email}</p>
          <button onClick={onLogout} style={styles.logoutButton}>
            Sair
          </button>
        </div>
      </div>

      <div style={styles.dashboardContent}>
        <div style={styles.ctaCard}>
          <h2>Novo Diagnóstico</h2>
          <p>Analise como sua empresa é percebida pelas IAs generativas</p>
          <button onClick={onNewDiagnosis} style={styles.button}>
            Começar Análise
          </button>
        </div>
      </div>
    </div>
  );
};

const DiagnosisInputPage: React.FC<{
  onAnalyze: (data: any) => Promise<void>;
  onBack: () => void;
}> = ({ onAnalyze, onBack }) => {
  const [query, setQuery] = useState('');
  const [showContext, setShowContext] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [website, setWebsite] = useState('');
  const [segment, setSegment] = useState('');
  const [location, setLocation] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [showFinancial, setShowFinancial] = useState(false);
  const [revenue, setRevenue] = useState('');
  const [ebitda, setEbitda] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setErrors({
        query:
          'Digite uma marca, empresa, site, CNPJ, segmento ou palavra-chave para analisar.',
      });
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await onAnalyze({
        query: trimmedQuery,
        company_name: companyName.trim() || undefined,
        cnpj: cnpj.trim() || undefined,
        website: website.trim() || undefined,
        segment: segment.trim() || undefined,
        location: location.trim() || undefined,
        competitors: competitors
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        revenue: revenue ? Number(revenue) : undefined,
        ebitda: ebitda ? Number(ebitda) : undefined,
      });
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Erro ao analisar',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.inputPage}>
      <button onClick={onBack} style={styles.backButton}>
        ← Voltar
      </button>

      <div style={styles.inputCard}>
        <h1 style={{ marginTop: 0 }}>Novo Diagnóstico</h1>
        <p style={styles.inputSubtitle}>
          Informe apenas o que você souber. O ANAIA tenta identificar e enriquecer
          o restante automaticamente.
        </p>

        <div style={styles.formGroup}>
          <label>O que você quer analisar?</label>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (errors.query) {
                setErrors((current) => ({ ...current, query: '' }));
              }
            }}
            placeholder="Ex.: Nike, Nubank, aparecanaia.com.br, software de FP&A..."
            style={styles.searchInput}
            disabled={loading}
            autoFocus
          />
          <span style={styles.helperText}>
            Pode ser nome da marca, empresa, site, CNPJ, segmento, produto,
            categoria ou palavra-chave.
          </span>
          {errors.query && <span style={styles.error}>{errors.query}</span>}
        </div>

        <button
          type="button"
          onClick={() => setShowContext(!showContext)}
          style={styles.secondaryButton}
          disabled={loading}
        >
          {showContext ? '− Ocultar contexto adicional' : '+ Adicionar mais contexto'}
        </button>

        {showContext && (
          <div style={styles.optionalPanel}>
            <div style={styles.formGroup}>
              <label>Nome da empresa ou marca <span style={styles.optionalLabel}>(opcional)</span></label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex.: Empresa Exemplo"
                style={styles.input}
                disabled={loading}
              />
            </div>

            <div style={styles.formGroup}>
              <label>CNPJ <span style={styles.optionalLabel}>(opcional)</span></label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0000-00"
                style={styles.input}
                disabled={loading}
              />
            </div>

            <div style={styles.formGroup}>
              <label>Website <span style={styles.optionalLabel}>(opcional)</span></label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://www.empresa.com.br"
                style={styles.input}
                disabled={loading}
              />
            </div>

            <div style={styles.formGroup}>
              <label>Segmento <span style={styles.optionalLabel}>(opcional)</span></label>
              <input
                type="text"
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                placeholder="Ex.: Software / SaaS"
                style={styles.input}
                disabled={loading}
              />
            </div>

            <div style={styles.formGroup}>
              <label>Localização <span style={styles.optionalLabel}>(opcional)</span></label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex.: Brasil, São Paulo"
                style={styles.input}
                disabled={loading}
              />
            </div>

            <div style={styles.formGroup}>
              <label>Concorrentes conhecidos <span style={styles.optionalLabel}>(opcional)</span></label>
              <input
                type="text"
                value={competitors}
                onChange={(e) => setCompetitors(e.target.value)}
                placeholder="Separe por vírgulas"
                style={styles.input}
                disabled={loading}
              />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowFinancial(!showFinancial)}
          style={styles.secondaryButton}
          disabled={loading}
        >
          {showFinancial ? '− Ocultar dados financeiros' : '+ Adicionar dados financeiros'}
        </button>

        {showFinancial && (
          <div style={styles.optionalPanel}>
            <div style={styles.formGroup}>
              <label>Receita Anual (R$) <span style={styles.optionalLabel}>(opcional)</span></label>
              <input
                type="number"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                placeholder="Ex.: 1000000"
                style={styles.input}
                disabled={loading}
              />
            </div>

            <div style={styles.formGroup}>
              <label>EBITDA (R$) <span style={styles.optionalLabel}>(opcional)</span></label>
              <input
                type="number"
                value={ebitda}
                onChange={(e) => setEbitda(e.target.value)}
                placeholder="Ex.: 200000"
                style={styles.input}
                disabled={loading}
              />
            </div>
          </div>
        )}

        {errors.general && <span style={styles.error}>{errors.general}</span>}

        <button
          onClick={handleAnalyze}
          style={{
            ...styles.button,
            opacity: loading || !query.trim() ? 0.6 : 1,
          }}
          disabled={loading || !query.trim()}
        >
          {loading ? 'Analisando...' : 'Analisar'}
        </button>
      </div>
    </div>
  );
};

const ProcessingPage: React.FC<{ company: string }> = ({ company }) => {
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);

  React.useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const steps = [
    { label: 'Preparando diagnóstico', description: 'Validando os dados enviados', startsAt: 0 },
    { label: 'Analisando presença digital', description: 'Estruturando sinais da empresa e website', startsAt: 4 },
    { label: 'Consultando inteligências artificiais', description: 'OpenAI, Claude e Gemini são processadas em paralelo', startsAt: 10 },
    { label: 'Consolidando o AI Visibility Score', description: 'Somente modelos com resposta válida entram no score', startsAt: 24 },
    { label: 'Gerando diagnóstico executivo', description: 'Finalizando score, gaps e plano de ação', startsAt: 40 },
  ];

  const currentStepIndex = Math.min(
    steps.reduce(
      (current, step, index) => elapsedSeconds >= step.startsAt ? index : current,
      0
    ),
    steps.length - 1
  );

  const estimatedProgress =
    elapsedSeconds < 4 ? 10 + elapsedSeconds * 4 :
    elapsedSeconds < 10 ? 26 + (elapsedSeconds - 4) * 4 :
    elapsedSeconds < 24 ? 50 + (elapsedSeconds - 10) * 1.5 :
    elapsedSeconds < 40 ? 71 + (elapsedSeconds - 24) * 0.9 :
    Math.min(92, 86 + (elapsedSeconds - 40) * 0.25);

  const isTakingLonger = elapsedSeconds >= 45;

  const formatElapsed = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return minutes > 0
      ? `${minutes}m ${remaining.toString().padStart(2, '0')}s`
      : `${remaining}s`;
  };

  return (
    <div
      style={{
        ...styles.processingPage,
        background:
          'radial-gradient(circle at 50% 20%, rgba(37,99,235,.08), transparent 34%), #f8fafc',
      }}
    >
      <div
        style={{
          ...styles.processingCard,
          width: '100%',
          maxWidth: '720px',
          padding: '40px',
          textAlign: 'left',
          boxShadow: '0 24px 70px rgba(15,23,42,.10)',
          borderRadius: '22px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '1.4px',
                textTransform: 'uppercase',
                color: '#2563eb',
                marginBottom: '8px',
              }}
            >
              ANAIA · Diagnóstico em andamento
            </div>

            <h1 style={{ margin: 0, fontSize: '30px', letterSpacing: '-0.8px' }}>
              Analisando {company}
            </h1>

            <p style={{ color: '#64748b', lineHeight: 1.6, margin: '10px 0 0', maxWidth: '520px' }}>
              Estamos consultando fontes e modelos de IA. O tempo pode variar de acordo com a disponibilidade de cada provedor.
            </p>
          </div>

          <div
            style={{
              minWidth: '96px',
              padding: '12px 14px',
              borderRadius: '12px',
              background: '#eff6ff',
              border: '1px solid #dbeafe',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>TEMPO</div>
            <strong style={{ color: '#1d4ed8', fontSize: '16px' }}>
              {formatElapsed(elapsedSeconds)}
            </strong>
          </div>
        </div>

        <div style={{ marginTop: '30px', display: 'grid', gap: '10px' }}>
          {steps.map((step, index) => {
            const completed = index < currentStepIndex;
            const active = index === currentStepIndex;

            return (
              <div
                key={step.label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '38px 1fr auto',
                  gap: '12px',
                  alignItems: 'center',
                  padding: '14px',
                  borderRadius: '14px',
                  border: active ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                  background: active ? '#eff6ff' : '#ffffff',
                  opacity: index > currentStepIndex ? 0.58 : 1,
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    background: completed ? '#16a34a' : active ? '#2563eb' : '#e2e8f0',
                    color: completed || active ? '#fff' : '#64748b',
                  }}
                >
                  {completed ? '✓' : active ? '•' : index + 1}
                </div>

                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                    {step.description}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 750,
                    color: completed ? '#15803d' : active ? '#1d4ed8' : '#94a3b8',
                  }}
                >
                  {completed ? 'Concluído' : active ? 'Em andamento' : 'Aguardando'}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '26px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '11px', color: '#64748b' }}>
            <span>Estimativa de progresso</span>
            <strong>{Math.round(estimatedProgress)}%</strong>
          </div>

          <div style={{ ...styles.progressBar, height: '8px', marginBottom: 0 }}>
            <div
              style={{
                ...styles.progressFill,
                width: `${estimatedProgress}%`,
                borderRadius: '999px',
                transition: 'width .7s ease',
              }}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: '18px',
            padding: '12px 14px',
            borderRadius: '12px',
            background: isTakingLonger ? '#fffbeb' : '#f8fafc',
            border: `1px solid ${isTakingLonger ? '#fde68a' : '#e2e8f0'}`,
            fontSize: '11px',
            color: isTakingLonger ? '#92400e' : '#64748b',
            lineHeight: 1.5,
          }}
        >
          {isTakingLonger
            ? 'A análise está levando um pouco mais de tempo porque um ou mais provedores de IA estão respondendo lentamente. O ANAIA continuará usando apenas respostas válidas.'
            : 'Você pode permanecer nesta página. O resultado será aberto automaticamente assim que o diagnóstico terminar.'}
        </div>
      </div>
    </div>
  );
};

const ResultPage: React.FC<{
  result: DiagnosticResult;
  onBack: () => void;
}> = ({ result, onBack }) => {
  const [activeTab, setActiveTab] =
    React.useState<'overview' | 'detailed'>('overview');

  const isFiniteNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value);

  const formatScore = (value: unknown, digits = 1) =>
    isFiniteNumber(value)
      ? value.toLocaleString('pt-BR', {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        })
      : '—';

  const ai = result.ai_visibility ?? {};
  const aiScore = isFiniteNumber(ai.score) ? ai.score : null;
  const aiConfidence = isFiniteNumber(ai.confidence) ? ai.confidence : 0;
  const aiCoverage = isFiniteNumber(ai.coverage) ? ai.coverage : 0;
  const modelsRequested = isFiniteNumber(ai.models_requested) ? ai.models_requested : 3;
  const modelsAvailable = isFiniteNumber(ai.models_available) ? ai.models_available : 0;
  const providers = ai.providers ?? {};
  const dimensions = ai.dimensions ?? {};

  const providerConfig = [
    { key: 'openai', name: 'OpenAI', short: 'GPT' },
    { key: 'anthropic', name: 'Claude', short: 'CL' },
    { key: 'gemini', name: 'Gemini', short: 'GM' },
  ] as const;

  const getProviderStatus = (provider: any) => {
    if (provider?.success) {
      return {
        label: 'Online',
        code: 'ONLINE',
        tone: '#16a34a',
        bg: '#f0fdf4',
        border: '#bbf7d0',
      };
    }

    const error = String(provider?.error || '');

    if (error.includes('FORA_DO_AR_001')) {
      return {
        label: 'Saldo ou quota indisponível',
        code: '001',
        tone: '#b45309',
        bg: '#fffbeb',
        border: '#fde68a',
      };
    }

    if (error.includes('FORA_DO_AR_002')) {
      return {
        label: 'Indisponibilidade técnica',
        code: '002',
        tone: '#dc2626',
        bg: '#fef2f2',
        border: '#fecaca',
      };
    }

    return {
      label: 'Indisponível',
      code: '002',
      tone: '#64748b',
      bg: '#f8fafc',
      border: '#e2e8f0',
    };
  };

  const dimensionLabels: Record<string, string> = {
    presence: 'Presença',
    recommendation: 'Recomendação',
    position: 'Posição',
    relevance: 'Relevância',
    competitive_share: 'Share competitivo',
    consistency: 'Consistência',
  };

  const dimensionEntries = Object.entries(dimensions)
    .filter(([, value]) => isFiniteNumber(value))
    .map(([key, value]) => ({
      key,
      label: dimensionLabels[key] || key.replace(/_/g, ' '),
      value: Number(value),
    }));

  const weakestDimension =
    dimensionEntries.length > 0
      ? [...dimensionEntries].sort((a, b) => a.value - b.value)[0]
      : null;

  const competitors =
    result.request_context?.competitors?.filter(Boolean) ?? [];

  const benchmark = result.benchmark ?? null;
  const benchmarkRanking = Array.isArray(benchmark?.ranking)
    ? benchmark.ranking
    : [];

  const benchmarkCompany =
    benchmark?.company ?? null;

  const benchmarkLeader =
    benchmark?.leader ?? null;

  const benchmarkHasData =
    benchmarkRanking.length > 0;

  const benchmarkHeadline = (() => {
    if (!benchmarkHasData || !benchmarkCompany) {
      return null;
    }

    if (benchmarkCompany.rank === 1) {
      const secondPlace = benchmarkRanking.find(
        (entry: any) => entry.rank === 2
      );

      if (
        secondPlace &&
        typeof benchmarkCompany.score === 'number' &&
        typeof secondPlace.score === 'number'
      ) {
        const lead =
          Math.round(
            (benchmarkCompany.score - secondPlace.score) * 10
          ) / 10;

        return `Você lidera o benchmark por ${lead.toLocaleString(
          'pt-BR',
          {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          }
        )} pontos.`;
      }

      return 'Você lidera o benchmark competitivo.';
    }

    if (
      typeof benchmarkCompany.gap_to_leader === 'number' &&
      benchmarkLeader
    ) {
      return `Você está ${
        benchmarkCompany.gap_to_leader
      .toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} pontos atrás de ${benchmarkLeader.name}.`;
    }

    return `Sua posição atual é #${benchmarkCompany.rank}.`;
  })();

  const abvsScore = isFiniteNumber(result.abvs?.score) ? result.abvs.score : null;

  const abvsLabel =
    abvsScore === null
      ? 'Sem dados suficientes'
      : abvsScore >= 75
      ? 'Excelente'
      : abvsScore >= 60
      ? 'Bom'
      : abvsScore >= 45
      ? 'Adequado'
      : 'Limitado';

  const scoreLabel =
    aiScore === null
      ? 'Sem leitura suficiente'
      : aiScore >= 85
      ? 'Visibilidade muito forte'
      : aiScore >= 70
      ? 'Visibilidade forte'
      : aiScore >= 50
      ? 'Visibilidade moderada'
      : 'Visibilidade baixa';

  const ui: Record<string, React.CSSProperties> = {
    hero: {
      background:
        'radial-gradient(circle at 90% 10%, rgba(37,99,235,.18), transparent 32%), linear-gradient(135deg, #0f172a 0%, #172554 55%, #1d4ed8 140%)',
      borderRadius: '24px',
      padding: '32px',
      color: '#fff',
      boxShadow: '0 24px 70px rgba(15,23,42,.20)',
      marginBottom: '22px',
      overflow: 'hidden',
    },
    heroTop: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '24px',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
    },
    eyebrow: {
      fontSize: '11px',
      textTransform: 'uppercase',
      letterSpacing: '1.5px',
      fontWeight: 800,
      color: '#bfdbfe',
      marginBottom: '10px',
    },
    heroScore: {
      fontSize: '72px',
      fontWeight: 800,
      lineHeight: .95,
      letterSpacing: '-4px',
      margin: '0',
    },
    heroLabel: {
      marginTop: '10px',
      fontSize: '15px',
      color: '#dbeafe',
    },
    heroMetaGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(130px, 1fr))',
      gap: '10px',
      minWidth: '300px',
    },
    heroMeta: {
      padding: '14px 16px',
      border: '1px solid rgba(255,255,255,.14)',
      background: 'rgba(255,255,255,.08)',
      borderRadius: '14px',
      backdropFilter: 'blur(8px)',
    },
    heroMetaLabel: {
      display: 'block',
      fontSize: '11px',
      color: '#bfdbfe',
      marginBottom: '4px',
    },
    heroMetaValue: {
      fontSize: '16px',
      fontWeight: 750,
    },
    section: {
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: '18px',
      padding: '24px',
      boxShadow: '0 10px 30px rgba(15,23,42,.05)',
    },
    sectionHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '18px',
    },
    sectionTitle: {
      margin: 0,
      fontSize: '18px',
      fontWeight: 750,
      letterSpacing: '-.2px',
    },
    sectionSubtitle: {
      margin: '5px 0 0',
      fontSize: '12px',
      color: '#64748b',
      lineHeight: 1.5,
    },
    providerGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
      gap: '14px',
    },
    providerCard: {
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      padding: '18px',
      background: '#fff',
    },
    providerTop: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px',
    },
    providerIdentity: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    providerLogo: {
      width: '36px',
      height: '36px',
      borderRadius: '10px',
      background: '#eff6ff',
      color: '#1d4ed8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 800,
      fontSize: '11px',
    },
    providerScore: {
      fontSize: '28px',
      fontWeight: 800,
      letterSpacing: '-1px',
      marginTop: '18px',
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      borderRadius: '999px',
      padding: '6px 9px',
      fontSize: '10px',
      fontWeight: 750,
      whiteSpace: 'nowrap',
    },
    twoColumn: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '16px',
    },
    metricGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '12px',
    },
    metric: {
      border: '1px solid #e2e8f0',
      borderRadius: '14px',
      padding: '18px',
      background: '#f8fafc',
    },
    metricValue: {
      fontSize: '26px',
      fontWeight: 800,
      letterSpacing: '-1px',
      color: '#0f172a',
    },
    metricName: {
      fontSize: '11px',
      color: '#64748b',
      marginTop: '7px',
    },
    insight: {
      borderRadius: '16px',
      padding: '18px',
      background: '#eff6ff',
      border: '1px solid #bfdbfe',
    },
    competitorList: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '9px',
    },
    competitorChip: {
      border: '1px solid #dbeafe',
      background: '#eff6ff',
      color: '#1e40af',
      borderRadius: '999px',
      padding: '9px 12px',
      fontSize: '12px',
      fontWeight: 650,
    },
    rankingList: {
      display: 'grid',
      gap: '10px',
    },
    rankingRow: {
      display: 'grid',
      gridTemplateColumns: '42px minmax(0, 1fr) 70px 64px',
      gap: '12px',
      alignItems: 'center',
      padding: '13px 14px',
      borderRadius: '14px',
      border: '1px solid #e2e8f0',
      background: '#ffffff',
    },
    rankingPosition: {
      width: '32px',
      height: '32px',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 800,
      fontSize: '12px',
      background: '#f1f5f9',
      color: '#475569',
    },
    rankingName: {
      fontSize: '13px',
      fontWeight: 750,
      color: '#0f172a',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    rankingScore: {
      textAlign: 'right',
      fontSize: '18px',
      fontWeight: 800,
      color: '#0f172a',
    },
    rankingGap: {
      textAlign: 'right',
      fontSize: '11px',
      fontWeight: 700,
      color: '#64748b',
    },
    rankingSummary: {
      marginTop: '14px',
      padding: '12px 14px',
      borderRadius: '12px',
      background: '#eff6ff',
      border: '1px solid #bfdbfe',
      color: '#1e3a8a',
      fontSize: '12px',
      fontWeight: 650,
      lineHeight: 1.5,
    },
    dimensionRow: {
      display: 'grid',
      gridTemplateColumns: '135px 1fr 48px',
      gap: '12px',
      alignItems: 'center',
      fontSize: '12px',
      marginBottom: '14px',
    },
    dimensionTrack: {
      height: '8px',
      background: '#eef2f7',
      borderRadius: '999px',
      overflow: 'hidden',
    },
    dimensionFill: {
      height: '100%',
      borderRadius: '999px',
      background: 'linear-gradient(90deg, #2563eb, #60a5fa)',
    },
    muted: {
      color: '#64748b',
      fontSize: '12px',
      lineHeight: 1.55,
    },
  };

  return (
    <div style={{ ...styles.resultPage, maxWidth: '1120px' }}>
      <button onClick={onBack} style={styles.backButton}>
        ← Novo Diagnóstico
      </button>

      <div style={ui.hero}>
        <div style={ui.heroTop}>
          <div>
            <div style={ui.eyebrow}>ANAIA AI Visibility Command Center</div>
            <div style={ui.heroScore}>{formatScore(aiScore)}</div>
            <div style={ui.heroLabel}>{scoreLabel}</div>
          </div>

          <div style={ui.heroMetaGrid}>
            <div style={ui.heroMeta}>
              <span style={ui.heroMetaLabel}>Cobertura de IAs</span>
              <span style={ui.heroMetaValue}>
                {modelsAvailable}/{modelsRequested} · {formatScore(aiCoverage)}%
              </span>
            </div>

            <div style={ui.heroMeta}>
              <span style={ui.heroMetaLabel}>Confiança</span>
              <span style={ui.heroMetaValue}>{formatScore(aiConfidence)}%</span>
            </div>

            <div style={ui.heroMeta}>
              <span style={ui.heroMetaLabel}>ABVS</span>
              <span style={ui.heroMetaValue}>{formatScore(abvsScore, 0)}</span>
            </div>

            <div style={ui.heroMeta}>
              <span style={ui.heroMetaLabel}>Leitura</span>
              <span style={ui.heroMetaValue}>{abvsLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            ...styles.tab,
            borderBottom:
              activeTab === 'overview' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === 'overview' ? '#2563eb' : '#64748b',
          }}
        >
          Command Center
        </button>

        <button
          onClick={() => setActiveTab('detailed')}
          style={{
            ...styles.tab,
            borderBottom:
              activeTab === 'detailed' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === 'detailed' ? '#2563eb' : '#64748b',
          }}
        >
          Diagnóstico detalhado
        </button>
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={ui.section}>
            <div style={ui.sectionHeader}>
              <div>
                <h3 style={ui.sectionTitle}>Monitoramento multi-IA</h3>
                <p style={ui.sectionSubtitle}>
                  Veja quais modelos participaram do score consolidado desta análise.
                </p>
              </div>
              <span
                style={{
                  ...ui.badge,
                  color: modelsAvailable > 0 ? '#166534' : '#991b1b',
                  background: modelsAvailable > 0 ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${modelsAvailable > 0 ? '#bbf7d0' : '#fecaca'}`,
                }}
              >
                {modelsAvailable} de {modelsRequested} disponíveis
              </span>
            </div>

            <div style={ui.providerGrid}>
              {providerConfig.map(({ key, name, short }) => {
                const provider = providers?.[key];
                const status = getProviderStatus(provider);

                return (
                  <div key={key} style={ui.providerCard}>
                    <div style={ui.providerTop}>
                      <div style={ui.providerIdentity}>
                        <div style={ui.providerLogo}>{short}</div>
                        <div>
                          <div style={{ fontWeight: 750, fontSize: '14px' }}>{name}</div>
                          <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '2px' }}>
                            {provider?.model || 'Modelo não disponível'}
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          ...ui.badge,
                          color: status.tone,
                          background: status.bg,
                          border: `1px solid ${status.border}`,
                        }}
                      >
                        {status.code === 'ONLINE' ? '● Online' : `● Fora do ar ${status.code}`}
                      </span>
                    </div>

                    <div style={ui.providerScore}>
                      {provider?.success ? formatScore(provider.score) : '—'}
                    </div>

                    <div style={{ ...ui.muted, marginTop: '5px' }}>
                      {provider?.success
                        ? `${provider.observations_count ?? 0} observações válidas`
                        : status.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={ui.twoColumn}>
            <div style={ui.section}>
              <div style={ui.sectionHeader}>
                <div>
                  <h3 style={ui.sectionTitle}>AI Signals</h3>
                  <p style={ui.sectionSubtitle}>
                    Os sinais que explicam a nota consolidada.
                  </p>
                </div>
              </div>

              {dimensionEntries.length > 0 ? (
                dimensionEntries.map((item) => (
                  <div key={item.key} style={ui.dimensionRow}>
                    <span>{item.label}</span>
                    <div style={ui.dimensionTrack}>
                      <div
                        style={{
                          ...ui.dimensionFill,
                          width: `${Math.min(Math.max(item.value, 0), 100)}%`,
                        }}
                      />
                    </div>
                    <strong style={{ textAlign: 'right' }}>{formatScore(item.value, 0)}</strong>
                  </div>
                ))
              ) : (
                <p style={ui.muted}>Sem dimensões suficientes nesta análise.</p>
              )}
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={ui.section}>
                <h3 style={ui.sectionTitle}>Principal oportunidade</h3>

                {weakestDimension ? (
                  <div style={{ ...ui.insight, marginTop: '16px' }}>
                    <div style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 800 }}>
                      MENOR SINAL DA ANÁLISE
                    </div>
                    <div
                      style={{
                        fontSize: '24px',
                        fontWeight: 800,
                        marginTop: '6px',
                        letterSpacing: '-.7px',
                      }}
                    >
                      {weakestDimension.label} · {formatScore(weakestDimension.value, 0)}
                    </div>
                    <p style={{ ...ui.muted, color: '#334155', marginBottom: 0 }}>
                      É o ponto com maior espaço relativo para melhoria nesta leitura.
                    </p>
                  </div>
                ) : (
                  <p style={ui.muted}>Ainda não há sinais suficientes para priorizar uma oportunidade.</p>
                )}
              </div>

              <div style={ui.section}>
                <div style={ui.sectionHeader}>
                  <div>
                    <h3 style={ui.sectionTitle}>AI Competitive Benchmark</h3>
                    <p style={ui.sectionSubtitle}>
                      Ranking com a mesma metodologia aplicada à empresa e aos concorrentes.
                    </p>
                  </div>

                  {benchmarkHasData && benchmarkCompany?.rank && (
                    <span
                      style={{
                        ...ui.badge,
                        color:
                          benchmarkCompany.rank === 1
                            ? '#166534'
                            : '#1d4ed8',
                        background:
                          benchmarkCompany.rank === 1
                            ? '#f0fdf4'
                            : '#eff6ff',
                        border:
                          benchmarkCompany.rank === 1
                            ? '1px solid #bbf7d0'
                            : '1px solid #bfdbfe',
                      }}
                    >
                      Sua posição · #{benchmarkCompany.rank}
                    </span>
                  )}
                </div>

                {benchmarkHasData ? (
                  <>
                    <div style={ui.rankingList}>
                      {benchmarkRanking.map((entry: any) => {
                        const isPrimary = entry?.is_primary === true;
                        const available =
                          entry?.status === 'available' &&
                          typeof entry?.score === 'number';

                        return (
                          <div
                            key={`${entry.name}-${entry.rank}`}
                            style={{
                              ...ui.rankingRow,
                              background: isPrimary
                                ? '#eff6ff'
                                : '#ffffff',
                              border: isPrimary
                                ? '1px solid #93c5fd'
                                : '1px solid #e2e8f0',
                            }}
                          >
                            <div
                              style={{
                                ...ui.rankingPosition,
                                background:
                                  entry.rank === 1
                                    ? '#dbeafe'
                                    : '#f1f5f9',
                                color:
                                  entry.rank === 1
                                    ? '#1d4ed8'
                                    : '#475569',
                              }}
                            >
                              #{entry.rank ?? '—'}
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div style={ui.rankingName}>
                                {entry.name}
                                {isPrimary && (
                                  <span
                                    style={{
                                      marginLeft: '7px',
                                      color: '#2563eb',
                                      fontSize: '10px',
                                      fontWeight: 800,
                                    }}
                                  >
                                    VOCÊ
                                  </span>
                                )}
                              </div>

                              <div
                                style={{
                                  ...ui.muted,
                                  marginTop: '3px',
                                }}
                              >
                                {available
                                  ? `${entry.models_available}/${entry.models_requested} IAs disponíveis`
                                  : 'Sem dados suficientes'}
                              </div>
                            </div>

                            <div style={ui.rankingScore}>
                              {available
                                ? formatScore(entry.score)
                                : '—'}
                            </div>

                            <div style={ui.rankingGap}>
                              {available &&
                              typeof entry.gap_to_leader === 'number'
                                ? entry.gap_to_leader === 0
                                  ? 'Líder'
                                  : `-${formatScore(
                                      entry.gap_to_leader
                                    )}`
                                : '—'}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {benchmarkHeadline && (
                      <div style={ui.rankingSummary}>
                        {benchmarkHeadline}
                      </div>
                    )}

                    {benchmark?.requested_competitors >
                      benchmark?.analyzed_competitors && (
                      <p
                        style={{
                          ...ui.muted,
                          marginBottom: 0,
                          marginTop: '12px',
                        }}
                      >
                        Alguns concorrentes não puderam ser pontuados porque não houve resposta válida suficiente dos provedores.
                      </p>
                    )}
                  </>
                ) : competitors.length > 0 ? (
                  <>
                    <div style={ui.competitorList}>
                      {competitors.map((competitor) => (
                        <span key={competitor} style={ui.competitorChip}>
                          {competitor}
                        </span>
                      ))}
                    </div>

                    <p
                      style={{
                        ...ui.muted,
                        marginBottom: 0,
                        marginTop: '14px',
                      }}
                    >
                      Os concorrentes foram informados, mas o benchmark não retornou dados suficientes nesta execução.
                    </p>
                  </>
                ) : (
                  <p style={ui.muted}>
                    Nenhum concorrente foi informado. No próximo diagnóstico,
                    adicione até 3 concorrentes para gerar o ranking competitivo.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div style={ui.section}>
            <div style={ui.sectionHeader}>
              <div>
                <h3 style={ui.sectionTitle}>Visão executiva</h3>
                <p style={ui.sectionSubtitle}>
                  Leitura rápida dos principais sinais de negócio.
                </p>
              </div>
            </div>

            <div style={ui.metricGrid}>
              <div style={ui.metric}>
                <div style={ui.metricValue}>{formatScore(aiScore)}</div>
                <div style={ui.metricName}>AI Visibility Score</div>
              </div>

              <div style={ui.metric}>
                <div style={ui.metricValue}>
                  {isFiniteNumber(result.financial?.score)
                    ? formatScore(result.financial.score, 0)
                    : 'N/A'}
                </div>
                <div style={ui.metricName}>Força financeira</div>
              </div>

              <div style={ui.metric}>
                <div style={ui.metricValue}>{formatScore(result.competitive_position, 0)}</div>
                <div style={ui.metricName}>Posição competitiva estimada</div>
              </div>

              <div style={ui.metric}>
                <div style={ui.metricValue}>{formatScore(result.digital_authority, 0)}</div>
                <div style={ui.metricName}>Autoridade digital</div>
              </div>
            </div>
          </div>

          {result.gap?.is_available && (
            <div style={ui.section}>
              <h3 style={ui.sectionTitle}>Gap IA-Financeiro</h3>
              <p style={styles.sectionValue}>{result.gap.gap} pontos</p>
              <p style={styles.sectionDescription}>{result.gap.interpretation}</p>
            </div>
          )}

          {result.actions?.length > 0 && (
            <div style={ui.section}>
              <div style={ui.sectionHeader}>
                <div>
                  <h3 style={ui.sectionTitle}>Plano de ação</h3>
                  <p style={ui.sectionSubtitle}>
                    Prioridades sugeridas a partir dos sinais disponíveis.
                  </p>
                </div>
              </div>

              <div style={styles.actionList}>
                {result.actions.map((action, idx) => (
                  <div key={idx} style={styles.actionItem}>
                    <div style={styles.actionPriority}>{action.priority}</div>
                    <div style={styles.actionContent}>
                      <p style={styles.actionTitle}>{action.title}</p>
                      <p style={styles.actionDescription}>{action.description}</p>
                    </div>
                    <span style={styles.actionImpact}>{action.impact}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'detailed' && (
        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={ui.section}>
            <div style={ui.sectionHeader}>
              <div>
                <h3 style={ui.sectionTitle}>Metodologia da análise</h3>
                <p style={ui.sectionSubtitle}>
                  Transparência sobre cobertura, consistência e profundidade.
                </p>
              </div>
            </div>

            <div style={ui.metricGrid}>
              <div style={ui.metric}>
                <div style={ui.metricValue}>{formatScore(aiCoverage)}%</div>
                <div style={ui.metricName}>Cobertura de IAs</div>
              </div>
              <div style={ui.metric}>
                <div style={ui.metricValue}>{formatScore(aiConfidence)}%</div>
                <div style={ui.metricName}>Confiança</div>
              </div>
              <div style={ui.metric}>
                <div style={ui.metricValue}>
                  {formatScore(ai.cross_model_consistency, 0)}
                </div>
                <div style={ui.metricName}>Consistência entre modelos</div>
              </div>
              <div style={ui.metric}>
                <div style={ui.metricValue}>{ai.observations_count ?? 0}</div>
                <div style={ui.metricName}>Observações válidas</div>
              </div>
            </div>
          </div>

          <div style={ui.section}>
            <h3 style={ui.sectionTitle}>Dados da empresa</h3>
            <div style={{ ...styles.dataGrid, marginTop: '18px' }}>
              <div>
                <strong>Empresa:</strong> {result.company?.company_name || 'N/A'}
              </div>
              <div>
                <strong>CNPJ:</strong> {result.company?.cnpj || 'N/A'}
              </div>
              <div>
                <strong>Situação:</strong> {result.company?.status || 'N/A'}
              </div>
              <div>
                <strong>Porte:</strong> {result.company?.company_size || 'N/A'}
              </div>
              <div>
                <strong>CNAE:</strong> {result.company?.primary_cnae || 'N/A'}
              </div>
            </div>
          </div>

          <div style={ui.section}>
            <h3 style={ui.sectionTitle}>Qualidade dos dados</h3>
            <div style={{ ...styles.dataGrid, marginTop: '18px' }}>
              <div>
                <strong>Empresa:</strong> {result.data_quality?.company_data || 'N/A'}
              </div>
              <div>
                <strong>Website:</strong> {result.data_quality?.website_data || 'N/A'}
              </div>
              <div>
                <strong>Modelos disponíveis:</strong>{' '}
                {result.data_quality?.ai_models_available ?? modelsAvailable}/{modelsRequested}
              </div>
              <div>
                <strong>Cobertura IA:</strong>{' '}
                {formatScore(result.data_quality?.ai_coverage ?? aiCoverage)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN APP
// ============================================================================

export default function ANAIAApp() {
  const [page, setPage] = React.useState<Page>('login');
  const [user, setUser] = React.useState<User | null>(null);
  const [result, setResult] = React.useState<DiagnosticResult | null>(null);
  const [currentCompany, setCurrentCompany] = React.useState('');
  const [checkingSession, setCheckingSession] = React.useState(true);

  React.useEffect(() => {
    let active = true;

    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        if (!active) return;

        if (!response.ok) {
          setUser(null);
          setPage('login');
          return;
        }

        const data = await response.json();

        if (data?.success && data?.authenticated && data?.user) {
          setUser({
            id: data.user.id,
            email: data.user.email || '',
          });
          setPage('dashboard');
        } else {
          setUser(null);
          setPage('login');
        }
      } catch (error) {
        console.error('Session check error:', error);

        if (active) {
          setUser(null);
          setPage('login');
        }
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    };

    loadSession();

    return () => {
      active = false;
    };
  }, []);

  const handleLogin = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setPage('dashboard');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setResult(null);
      setPage('login');
    }
  };

  const handleNewDiagnosis = () => {
    setPage('input');
  };

  const handleAnalyze = async (data: any) => {
    setCurrentCompany(data.query || data.company_name || data.website || data.cnpj || 'sua consulta');
    setPage('processing');

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 110000);

    try {
      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar diagnóstico');
      }

      const diagnosticResult = await response.json();

      const enrichedResult: DiagnosticResult = {
        ...diagnosticResult,
        request_context: {
          ...(diagnosticResult.request_context || {}),
          competitors: data.competitors || [],
          query: data.query,
          segment: data.segment,
          location: data.location,
        },
      };

      setResult(enrichedResult);
      setPage('result');
    } catch (error) {
      console.error('Diagnosis error:', error);

      if (error instanceof DOMException && error.name === 'AbortError') {
        setPage('input');
        alert('A análise ultrapassou 110 segundos. Tente novamente em alguns instantes.');
        return;
      }

      setPage('dashboard');
      alert(
        error instanceof Error
          ? error.message
          : 'Erro ao processar diagnóstico'
      );
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const handleBack = () => {
    if (page === 'result' || page === 'input') {
      setPage('dashboard');
    } else if (page === 'processing') {
      setPage('input');
    }
  };

  if (checkingSession) {
    return (
      <div style={styles.authContainer}>
        <div style={styles.authCard}>
          <h1 style={styles.authTitle}>ANAIA</h1>
          <p style={styles.authSubtitle}>Verificando sessão...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      {page === 'login' && <LoginPage onLogin={handleLogin} />}
      {page === 'signup' && <LoginPage onLogin={handleLogin} />}
      {page === 'dashboard' && user && (
        <DashboardPage
          user={user}
          onLogout={handleLogout}
          onNewDiagnosis={handleNewDiagnosis}
        />
      )}
      {page === 'input' && (
        <DiagnosisInputPage onAnalyze={handleAnalyze} onBack={handleBack} />
      )}
      {page === 'processing' && (
        <ProcessingPage company={currentCompany} />
      )}
      {page === 'result' && result && (
        <ResultPage result={result} onBack={handleBack} />
      )}
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles: { [key: string]: React.CSSProperties } = {
  app: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    background: '#ffffff',
    minHeight: '100vh',
    color: '#0f172a',
    letterSpacing: '0.3px',
    margin: 0,
    padding: 0,
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
    background: '#ffffff',
    backdropFilter: 'blur(12px)',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 12px 36px rgba(15, 23, 42, 0.10)',
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
    color: '#64748b',
    margin: '0 0 24px',
  },

  formGroup: {
    marginBottom: '20px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    color: '#0f172a',
    fontSize: '14px',
    marginTop: '8px',
    boxSizing: 'border-box',
    transition: 'all 0.3s ease',
  },
  searchInput: {
    width: '100%',
    padding: '16px 18px',
    background: '#ffffff',
    border: '1px solid #94a3b8',
    borderRadius: '10px',
    color: '#0f172a',
    fontSize: '16px',
    marginTop: '8px',
    boxSizing: 'border-box',
    outline: 'none',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
  },
  inputSubtitle: {
    fontSize: '14px',
    lineHeight: 1.6,
    color: '#64748b',
    margin: '0 0 24px',
  },
  helperText: {
    display: 'block',
    marginTop: '8px',
    fontSize: '12px',
    lineHeight: 1.5,
    color: '#64748b',
  },
  optionalLabel: {
    color: '#94a3b8',
    fontWeight: '400',
  },
  optionalPanel: {
    marginTop: '14px',
    padding: '18px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
  },
  secondaryButton: {
    width: '100%',
    padding: '11px 14px',
    marginTop: '12px',
    background: '#f8fafc',
    color: '#2563eb',
    border: '1px solid #dbeafe',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'left',
  },
  error: {
    display: 'block',
    color: '#ef4444',
    fontSize: '12px',
    marginTop: '4px',
  },

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
    background: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    marginTop: '8px',
  },

  backButton: {
    padding: '8px 16px',
    background: '#f1f5f9',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    marginBottom: '24px',
  },

  toggleAuth: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#64748b',
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
    alignItems: 'flex-start',
    marginBottom: '40px',
  },
  userSection: {
    textAlign: 'right',
  },
  dashboardContent: {
    display: 'grid',
    gap: '24px',
  },
  ctaCard: {
    background: '#ffffff',
    backdropFilter: 'blur(12px)',
    border: '1px solid #dbeafe',
    borderRadius: '12px',
    padding: '40px',
    textAlign: 'center',
  },

  // Input
  inputPage: {
    padding: '40px 20px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  inputCard: {
    background: '#ffffff',
    backdropFilter: 'blur(12px)',
    border: '1px solid #e2e8f0',
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
    background: '#ffffff',
    backdropFilter: 'blur(12px)',
    border: '1px solid #e2e8f0',
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
    background: '#e2e8f0',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
  },
  progressBar: {
    width: '100%',
    height: '6px',
    background: '#e2e8f0',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #2563eb, #1d4ed8)',
  },
  progressText: {
    fontSize: '14px',
    color: '#64748b',
  },

  // Result
  resultPage: {
    padding: '40px 20px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  abvsCard: {
    background: '#ffffff',
    backdropFilter: 'blur(12px)',
    border: '1px solid #dbeafe',
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
    color: '#64748b',
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
    background: '#ffffff',
    borderRadius: '8px',
  },

  tabs: {
    display: 'flex',
    gap: '24px',
    marginBottom: '24px',
    borderBottom: '1px solid #e2e8f0',
  },
  tab: {
    padding: '12px 0',
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  tabContent: {
    display: 'grid',
    gap: '24px',
  },

  sectionCard: {
    background: '#ffffff',
    backdropFilter: 'blur(12px)',
    border: '1px solid #e2e8f0',
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
    color: '#334155',
    marginTop: '12px',
  },

  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
  },
  metricCard: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    border: '1px solid #e2e8f0',
  },
  metricScore: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#2563eb',
  },
  metricLabel: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '8px',
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
    background: '#f8fafc',
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
    color: '#64748b',
    margin: 0,
  },
  actionImpact: {
    fontSize: '12px',
    padding: '4px 8px',
    background: '#ffedd5',
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
    background: '#e2e8f0',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  dimensionFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #2563eb, #1d4ed8)',
  },

  dataNote: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '12px',
  },

  dataGrid: {
    display: 'grid',
    gap: '12px',
  },
};