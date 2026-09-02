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
  competitive_position: number;
  digital_authority: number;
  abvs: any;
  gap: any;
  actions: any[];
  data_quality: any;
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
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
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
            {[
              { label: 'CNPJ Validado', threshold: 0 },
              { label: 'Dados Financeiros', threshold: 25 },
              { label: 'Visibilidade IA', threshold: 50 },
              { label: 'Análise Final', threshold: 75 },
            ].map((step, idx) => (
              <div key={idx} style={styles.step}>
                <span
                  style={
                    progress >= step.threshold ? styles.stepDot : styles.stepDotInactive
                  }
                >
                  {progress >= step.threshold ? '✓' : '○'}
                </span>
                <p>{step.label}</p>
              </div>
            ))}
          </div>

          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${progress}%`,
              }}
            ></div>
          </div>
          <p style={styles.progressText}>{Math.round(progress)}%</p>
        </div>
      </div>
    </div>
  );
};

const ResultPage: React.FC<{
  result: DiagnosticResult;
  onBack: () => void;
}> = ({ result, onBack }) => {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'detailed'>('overview');

  const abvsClass = result.abvs.score
    ? result.abvs.score >= 75
      ? 'excellent'
      : result.abvs.score >= 60
      ? 'good'
      : 'fair'
    : 'unknown';

  const abvsLabel =
    result.abvs.score >= 75
      ? 'Excelente'
      : result.abvs.score >= 60
      ? 'Bom'
      : result.abvs.score >= 45
      ? 'Adequado'
      : 'Limitado';

  return (
    <div style={styles.resultPage}>
      <button onClick={onBack} style={styles.backButton}>
        ← Novo Diagnóstico
      </button>

      {/* ABVS Card */}
      <div style={styles.abvsCard}>
        <div style={styles.abvsScore}>
          <div style={styles.abvsNumber}>{result.abvs.score || 'N/A'}</div>
          <div style={styles.abvsLabel}>{abvsLabel}</div>
        </div>
        <div style={styles.abvsDetails}>
          <div style={styles.detailItem}>
            <span>Confiabilidade</span>
            <strong>{result.abvs.confidence}%</strong>
          </div>
          <div style={styles.detailItem}>
            <span>Cobertura de Dados</span>
            <strong>{result.abvs.coverage}%</strong>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            ...styles.tab,
            borderBottom:
              activeTab === 'overview' ? '2px solid #2563eb' : 'none',
            color: activeTab === 'overview' ? '#2563eb' : '#666',
          }}
        >
          Visão Geral
        </button>
        <button
          onClick={() => setActiveTab('detailed')}
          style={{
            ...styles.tab,
            borderBottom:
              activeTab === 'detailed' ? '2px solid #2563eb' : 'none',
            color: activeTab === 'detailed' ? '#2563eb' : '#666',
          }}
        >
          Detalhado
        </button>
      </div>

      {activeTab === 'overview' && (
        <div style={styles.tabContent}>
          {/* Gap */}
          {result.gap.is_available && (
            <div style={styles.sectionCard}>
              <h3>Gap IA-Financeiro</h3>
              <p style={styles.sectionValue}>{result.gap.gap} pontos</p>
              <p style={styles.sectionDescription}>{result.gap.interpretation}</p>
            </div>
          )}

          {/* Metrics Grid */}
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <div style={styles.metricScore}>{result.ai_visibility.score}</div>
              <p style={styles.metricLabel}>Visibilidade IA</p>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricScore}>{result.financial.score || 'N/A'}</div>
              <p style={styles.metricLabel}>Força Financeira</p>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricScore}>{result.competitive_position}</div>
              <p style={styles.metricLabel}>Posição Competitiva</p>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricScore}>{result.digital_authority}</div>
              <p style={styles.metricLabel}>Autoridade Digital</p>
            </div>
          </div>

          {/* Action Plan */}
          {result.actions.length > 0 && (
            <div style={styles.sectionCard}>
              <h3>Plano de Ação</h3>
              <div style={styles.actionList}>
                {result.actions.map((action, idx) => (
                  <div key={idx} style={styles.actionItem}>
                    <div style={styles.actionPriority}>{action.priority}</div>
                    <div style={styles.actionContent}>
                      <p style={styles.actionTitle}>{action.title}</p>
                      <p style={styles.actionDescription}>
                        {action.description}
                      </p>
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
        <div style={styles.tabContent}>
          {/* AI Visibility Details */}
          <div style={styles.sectionCard}>
            <h3>Visibilidade em IA — Detalhes</h3>
            <div style={styles.dimensionsList}>
              {Object.entries(result.ai_visibility?.dimensions ?? {}).map(
                ([key, value]) => {
                  const numericValue =
                    typeof value === 'number' && Number.isFinite(value)
                      ? value
                      : 0;

                  const displayValue =
                    typeof value === 'number' && Number.isFinite(value)
                      ? String(Math.round(value))
                      : value === null || value === undefined
                      ? 'N/A'
                      : String(value);

                  return (
                    <div key={key} style={styles.dimensionRow}>
                      <span style={{ textTransform: 'capitalize' }}>
                        {key.replace(/_/g, ' ')}
                      </span>
                      <div style={styles.dimensionBar}>
                        <div
                          style={{
                            ...styles.dimensionFill,
                            width: `${Math.min(Math.max(numericValue, 0), 100)}%`,
                          }}
                        />
                      </div>
                      <span>{displayValue}</span>
                    </div>
                  );
                }
              )}
            </div>
            <p style={styles.dataNote}>
              Baseado em: {result.ai_visibility.observations_count} observações
            </p>
          </div>

          {/* Financial Details */}
          {result.financial.score !== null && (
            <div style={styles.sectionCard}>
              <h3>Força Financeira — Detalhes</h3>
              <p style={styles.dataNote}>
                {result.financial.interpretation}
              </p>
              <p style={styles.dataNote}>
                Cobertura: {result.financial.coverage}% |{' '}
                {result.financial.data_type.join(', ')}
              </p>
            </div>
          )}

          {/* Company Data */}
          <div style={styles.sectionCard}>
            <h3>Dados da Empresa</h3>
            <div style={styles.dataGrid}>
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

    try {
      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar diagnóstico');
      }

      const diagnosticResult = await response.json();
      setResult(diagnosticResult);
      setPage('result');
    } catch (error) {
      console.error('Diagnosis error:', error);
      setPage('dashboard');
      alert(error instanceof Error ? error.message : 'Erro ao processar diagnóstico');
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