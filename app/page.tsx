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

interface HistoryProviderItem {
  provider: string;
  model: string | null;
  score: number | null;
  success: boolean;
  observations_count: number;
  error_code?: string | null;
  error_message?: string | null;
}

interface HistoryItem {
  id: string;
  date: string;
  company: string;
  score: number | null;
  confidence: number | null;
  coverage: number | null;
  presence: number | null;
  recommendation: number | null;
  position: number | null;
  relevance: number | null;
  competitive_share: number | null;
  consistency: number | null;
  models_requested: number;
  models_available: number;
  observations_count: number;
  abvs: number | null;
  digital_authority: number | null;
  competitive_position: number | null;
  segment?: string | null;
  location?: string | null;
  methodology_version?: string | null;
  providers?: Record<string, HistoryProviderItem>;
}

interface HistoryResponse {
  success: boolean;
  authenticated?: boolean;
  company?: string | null;
  count?: number;
  history?: HistoryItem[];
  error?: string;
}

type Page =
  | 'landing'
  | 'login'
  | 'signup'
  | 'home'
  | 'research'
  | 'monitoring'
  | 'comparisons'
  | 'insights'
  | 'reports'
  | 'library'
  | 'processing'
  | 'result';

async function readApiPayload(response: Response) {
  const rawText = await response.text();

  if (!rawText) {
    return {
      data: null as any,
      rawText: '',
    };
  }

  try {
    return {
      data: JSON.parse(rawText),
      rawText,
    };
  } catch {
    return {
      data: null as any,
      rawText,
    };
  }
}

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

    const { data, rawText } = await readApiPayload(response);

    if (!response.ok || !data?.success || !data?.user) {
      throw new Error(
        data?.error ||
          rawText ||
          `Não foi possível realizar o login. HTTP ${response.status}`
      );
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

        const { data, rawText } = await readApiPayload(response);

        if (!response.ok || !data?.success) {
          throw new Error(
            data?.error ||
              rawText ||
              `Erro ao criar conta. HTTP ${response.status}`
          );
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



const PublicLandingPage: React.FC<{
  onLogin: () => void;
}> = ({ onLogin }) => {
  const scrollToHowItWorks = () => {
    document
      .getElementById('como-funciona')
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
  };

  const benefitCards = [
    {
      icon: '◎',
      title: 'Descubra como sua marca aparece',
      text:
        'Veja presença, recomendação, relevância e posição nas respostas das principais inteligências artificiais.',
    },
    {
      icon: '↗',
      title: 'Acompanhe sua evolução',
      text:
        'Monitore mudanças ao longo do tempo e identifique rapidamente ganhos ou perdas de visibilidade.',
    },
    {
      icon: '◇',
      title: 'Entenda seu cenário competitivo',
      text:
        'A ANAIA identifica entidades semelhantes, aplica a mesma metodologia e mostra sua posição no benchmark.',
    },
  ];

  const steps = [
    {
      number: '01',
      title: 'Pesquise',
      text:
        'Digite uma empresa, marca, produto ou serviço.',
    },
    {
      number: '02',
      title: 'A ANAIA analisa',
      text:
        'A plataforma consulta múltiplos modelos de IA e consolida apenas respostas válidas.',
    },
    {
      number: '03',
      title: 'Você decide',
      text:
        'Receba score, sinais, concorrentes, ranking e oportunidades em uma leitura executiva.',
    },
  ];

  return (
    <div style={styles.publicPage}>
      <header style={styles.publicHeader}>
        <div style={styles.publicHeaderInner}>
          <button
            type="button"
            style={styles.publicBrand}
            aria-label="ANAIA"
          >
            <span style={styles.brandMark}>A</span>
            <span>
              <strong style={styles.brandName}>ANAIA</strong>
              <span style={styles.brandSubtitle}>Apareça na IA</span>
            </span>
          </button>

          <nav style={styles.publicNav}>
            <button
              type="button"
              style={styles.publicNavLink}
              onClick={scrollToHowItWorks}
            >
              Como funciona
            </button>
            <a
              href="#recursos"
              style={styles.publicNavAnchor}
            >
              Recursos
            </a>
            <a
              href="#metodologia"
              style={styles.publicNavAnchor}
            >
              Metodologia
            </a>
          </nav>

          <div style={styles.publicHeaderActions}>
            <button
              type="button"
              style={styles.publicLoginButton}
              onClick={onLogin}
            >
              Entrar
            </button>
            <button
              type="button"
              style={styles.publicPrimaryButton}
              onClick={onLogin}
            >
              Experimentar ANAIA
            </button>
          </div>
        </div>
      </header>

      <main>
        <section style={styles.publicHeroSection}>
          <div style={styles.publicHeroGrid}>
            <div style={styles.publicHeroCopy}>
              <span style={styles.publicHeroPill}>
                INTELIGÊNCIA DE VISIBILIDADE EM IA
              </span>

              <h1 style={styles.publicHeroTitle}>
                Sua marca está sendo recomendada pelas IAs
                <span style={styles.publicHeroTitleAccent}>
                  {' '}— ou seus concorrentes estão ocupando esse espaço?
                </span>
              </h1>

              <p style={styles.publicHeroText}>
                Descubra como sua empresa aparece no ChatGPT, Gemini e Claude,
                compare sua posição com concorrentes semelhantes e acompanhe
                sua evolução ao longo do tempo com uma leitura clara e acionável.
              </p>

              <div style={styles.publicHeroActions}>
                <button
                  type="button"
                  style={styles.publicHeroPrimary}
                  onClick={onLogin}
                >
                  Analisar minha marca →
                </button>

                <button
                  type="button"
                  style={styles.publicHeroSecondary}
                  onClick={scrollToHowItWorks}
                >
                  Ver como funciona
                </button>
              </div>

              <div style={styles.publicTrustRow}>
                <span>✓ Multi-IA</span>
                <span>✓ Benchmark competitivo</span>
                <span>✓ Histórico de evolução</span>
                <span>✓ Insights acionáveis</span>
              </div>
            </div>

            <div style={styles.publicProductPreview}>
              <div style={styles.previewTop}>
                <div>
                  <span style={styles.previewEyebrow}>
                    ANAIA · AI Visibility
                  </span>
                  <strong style={styles.previewTitle}>
                    Visão executiva
                  </strong>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                  }}
                >
                  <span
                    style={{
                      padding: '6px 8px',
                      borderRadius: '999px',
                      background: 'rgba(255,255,255,.10)',
                      color: '#dbeafe',
                      fontSize: '8px',
                      fontWeight: 750,
                      border: '1px solid rgba(255,255,255,.10)',
                    }}
                  >
                    Exemplo ilustrativo
                  </span>

                  <span style={styles.previewLive}>
                    ● leitura ativa
                  </span>
                </div>
              </div>

              <div style={styles.previewScoreArea}>
                <div>
                  <span style={styles.previewScoreLabel}>
                    AI Visibility Score
                  </span>
                  <strong style={styles.previewScore}>
                    68
                  </strong>
                  <span style={styles.previewScoreHint}>
                    presença competitiva forte
                  </span>
                </div>

                <div style={styles.previewMiniGrid}>
                  <div style={styles.previewMiniCard}>
                    <span>Presença</span>
                    <strong>74</strong>
                  </div>
                  <div style={styles.previewMiniCard}>
                    <span>Recomendação</span>
                    <strong>61</strong>
                  </div>
                  <div style={styles.previewMiniCard}>
                    <span>Consistência</span>
                    <strong>72</strong>
                  </div>
                  <div style={styles.previewMiniCard}>
                    <span>Benchmark</span>
                    <strong>#2</strong>
                  </div>
                </div>
              </div>

              <div style={styles.previewChart}>
                <div style={styles.previewChartHeader}>
                  <span>Visibilidade por sinal</span>
                  <span>última leitura</span>
                </div>

                {[
                  ['Presença', 74],
                  ['Recomendação', 61],
                  ['Posição', 66],
                  ['Relevância', 78],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    style={styles.previewSignalRow}
                  >
                    <span>{label}</span>
                    <div style={styles.previewTrack}>
                      <div
                        style={{
                          ...styles.previewFill,
                          width: `${value}%`,
                        }}
                      />
                    </div>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>

              <div style={styles.previewFooter}>
                <span>
                  Compare sua marca com concorrentes realmente semelhantes.
                </span>
                <strong>Explorar benchmark →</strong>
              </div>
            </div>
          </div>
        </section>

        <section id="recursos" style={styles.publicSection}>
          <div style={styles.publicSectionHeading}>
            <span style={styles.publicSectionEyebrow}>
              O QUE A ANAIA FAZ
            </span>
            <h2 style={styles.publicSectionTitle}>
              Transforme respostas de IA em inteligência de negócio.
            </h2>
            <p style={styles.publicSectionText}>
              Um ambiente único para entender presença, evolução e
              posicionamento competitivo da sua marca.
            </p>
          </div>

          <div style={styles.publicBenefitGrid}>
            {benefitCards.map((card) => (
              <article
                key={card.title}
                style={styles.publicBenefitCard}
              >
                <div style={styles.publicBenefitIcon}>
                  {card.icon}
                </div>
                <h3 style={styles.publicBenefitTitle}>
                  {card.title}
                </h3>
                <p style={styles.publicBenefitText}>
                  {card.text}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="como-funciona"
          style={styles.publicHowSection}
        >
          <div style={styles.publicHowGrid}>
            <div>
              <span style={styles.publicSectionEyebrow}>
                SIMPLES PARA USAR
              </span>
              <h2 style={styles.publicSectionTitle}>
                Uma pergunta. Múltiplos modelos. Uma leitura clara.
              </h2>
              <p style={styles.publicSectionText}>
                A experiência foi desenhada para que qualquer pessoa
                consiga entender o resultado sem precisar dominar IA,
                SEO ou ciência de dados.
              </p>
            </div>

            <div style={styles.publicSteps}>
              {steps.map((step) => (
                <div
                  key={step.number}
                  style={styles.publicStep}
                >
                  <div style={styles.publicStepNumber}>
                    {step.number}
                  </div>
                  <div>
                    <h3 style={styles.publicStepTitle}>
                      {step.title}
                    </h3>
                    <p style={styles.publicStepText}>
                      {step.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="metodologia"
          style={styles.publicSection}
        >
          <div style={styles.publicMethodCard}>
            <div>
              <span style={styles.publicSectionEyebrowLight}>
                METODOLOGIA ANAIA
              </span>
              <h2 style={styles.publicMethodTitle}>
                Comparações que fazem sentido.
                Resultados que você consegue explicar.
              </h2>
              <p style={styles.publicMethodText}>
                A ANAIA trabalha com múltiplas IAs, separa modelos
                indisponíveis, identifica entidades comparáveis e só
                calcula ranking quando há dados válidos suficientes.
              </p>
            </div>

            <div style={styles.publicMethodGrid}>
              {[
                ['01', 'Presença'],
                ['02', 'Recomendação'],
                ['03', 'Posição'],
                ['04', 'Relevância'],
                ['05', 'Share competitivo'],
                ['06', 'Consistência'],
              ].map(([number, label]) => (
                <div
                  key={number}
                  style={styles.publicMethodItem}
                >
                  <span>{number}</span>
                  <strong>{label}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={styles.publicContentSection}>
          <div style={styles.publicSectionHeading}>
            <span style={styles.publicSectionEyebrow}>
              CONTEÚDO ANAIA
            </span>
            <h2 style={styles.publicSectionTitle}>
              Acompanhe o que estamos construindo e aprendendo sobre visibilidade em IA.
            </h2>
            <p style={styles.publicSectionText}>
              Conteúdos sobre AI Visibility, GEO, monitoramento, benchmark e inteligência competitiva.
            </p>
          </div>

          <div style={styles.publicVideoGrid}>
            {[
              {
                title: 'Visibilidade em IA',
                text: 'Entenda como marcas começam a ser encontradas e recomendadas por inteligências artificiais.',
              },
              {
                title: 'Monitoramento',
                text: 'Veja como acompanhar mudanças de presença, recomendação e posicionamento ao longo do tempo.',
              },
              {
                title: 'Benchmark competitivo',
                text: 'Aprenda como comparar sua marca com concorrentes realmente semelhantes usando a mesma metodologia.',
              },
            ].map((video) => (
              <a
                key={video.title}
                href="https://youtube.com/@aparecanaia"
                target="_blank"
                rel="noreferrer"
                style={styles.publicVideoCard}
              >
                <div style={styles.publicVideoPreview}>
                  <div style={styles.publicVideoPlay}>▶</div>
                  <span style={styles.publicVideoBadge}>
                    YouTube
                  </span>
                </div>

                <div style={styles.publicVideoBody}>
                  <h3 style={styles.publicVideoTitle}>
                    {video.title}
                  </h3>
                  <p style={styles.publicVideoText}>
                    {video.text}
                  </p>
                  <strong style={styles.publicVideoLink}>
                    Assistir no canal →
                  </strong>
                </div>
              </a>
            ))}
          </div>

          <div style={styles.publicSocialRow}>
            <div>
              <strong style={styles.publicSocialTitle}>
                Siga a ANAIA
              </strong>
              <p style={styles.publicSocialText}>
                Bastidores da construção, novidades e conteúdos sobre inteligência de visibilidade.
              </p>
            </div>

            <div style={styles.publicSocialActions}>
              <a
                href="https://www.instagram.com/apareca_na_ia"
                target="_blank"
                rel="noreferrer"
                style={styles.publicSocialButton}
              >
                Instagram · @apareca_na_ia
              </a>

              <a
                href="https://youtube.com/@aparecanaia"
                target="_blank"
                rel="noreferrer"
                style={styles.publicSocialButtonPrimary}
              >
                YouTube · @aparecanaia
              </a>
            </div>
          </div>
        </section>

        <section style={styles.publicCtaSection}>
          <div style={styles.publicCtaCard}>
            <span style={styles.publicSectionEyebrow}>
              SUA MARCA NAS IAS
            </span>
            <h2 style={styles.publicCtaTitle}>
              Você sabe o que as inteligências artificiais
              estão dizendo sobre sua marca?
            </h2>
            <p style={styles.publicCtaText}>
              Faça sua primeira análise e veja onde sua marca
              aparece, perde espaço e pode ganhar visibilidade.
            </p>
            <button
              type="button"
              style={styles.publicHeroPrimary}
              onClick={onLogin}
            >
              Experimentar ANAIA →
            </button>
          </div>
        </section>
      </main>

      <footer style={styles.publicFooter}>
        <div style={styles.publicFooterInner}>
          <div style={styles.publicBrand}>
            <span style={styles.brandMark}>A</span>
            <span>
              <strong style={styles.brandName}>ANAIA</strong>
              <span style={styles.brandSubtitle}>Apareça na IA</span>
            </span>
          </div>

          <span style={styles.publicFooterText}>
            Inteligência de visibilidade para a era das IAs.
          </span>

          <div style={styles.publicFooterSocial}>
            <a
              href="https://www.instagram.com/apareca_na_ia"
              target="_blank"
              rel="noreferrer"
              style={styles.publicFooterLink}
            >
              Instagram
            </a>
            <a
              href="https://youtube.com/@aparecanaia"
              target="_blank"
              rel="noreferrer"
              style={styles.publicFooterLink}
            >
              YouTube
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const TOP_NAV_ITEMS: Array<{ key: Page; label: string }> = [
  { key: 'home', label: 'Início' },
  { key: 'research', label: 'Pesquisa' },
  { key: 'monitoring', label: 'Monitoramento' },
  { key: 'comparisons', label: 'Comparativos' },
  { key: 'insights', label: 'Insights' },
  { key: 'reports', label: 'Relatórios' },
  { key: 'library', label: 'Biblioteca' },
];

const getActiveNavPage = (page: Page): Page => {
  if (page === 'processing' || page === 'result') {
    return 'research';
  }

  return page;
};

const TopNavigation: React.FC<{
  page: Page;
  user: User;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}> = ({ page, user, onNavigate, onLogout }) => {
  const activePage = getActiveNavPage(page);

  return (
    <header style={styles.topNav}>
      <div style={styles.topNavInner}>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          style={styles.brandButton}
          aria-label="Ir para o início"
        >
          <span style={styles.brandMark}>A</span>
          <span>
            <strong style={styles.brandName}>ANAIA</strong>
            <span style={styles.brandSubtitle}>Apareça na IA</span>
          </span>
        </button>

        <nav style={styles.navLinks} aria-label="Navegação principal">
          {TOP_NAV_ITEMS.map((item) => {
            const active = activePage === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                style={{
                  ...styles.navButton,
                  ...(active ? styles.navButtonActive : {}),
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div style={styles.navRight}>
          <button
            type="button"
            style={styles.notificationButton}
            title="Notificações"
            aria-label="Notificações"
          >
            ♢
          </button>

          <div style={styles.userBadge}>
            <div style={styles.userAvatar}>
              {(user.email?.[0] || 'U').toUpperCase()}
            </div>
            <div style={styles.userIdentity}>
              <strong style={styles.userEmail}>{user.email}</strong>
              <span style={styles.userRole}>Conta ANAIA</span>
            </div>
          </div>

          <button onClick={onLogout} style={styles.topLogoutButton}>
            Sair
          </button>
        </div>
      </div>
    </header>
  );
};

const HomePage: React.FC<{
  onNewDiagnosis: () => void;
  result: DiagnosticResult | null;
}> = ({ onNewDiagnosis, result }) => {
  const latestScore =
    typeof result?.ai_visibility?.score === 'number'
      ? result.ai_visibility.score
      : null;

  const latestCoverage =
    typeof result?.ai_visibility?.coverage === 'number'
      ? result.ai_visibility.coverage
      : null;

  const companyName =
    result?.company?.company_name ||
    result?.request_context?.query ||
    'Nenhuma empresa analisada';

  return (
    <div style={styles.modulePage}>
      <div style={styles.pageHeading}>
        <div>
          <span style={styles.pageEyebrow}>Visão executiva</span>
          <h1 style={styles.pageTitle}>Início</h1>
          <p style={styles.pageSubtitle}>
            Acompanhe os sinais mais importantes da sua presença nas IAs.
          </p>
        </div>

        <button onClick={onNewDiagnosis} style={styles.primaryCompactButton}>
          + Nova análise
        </button>
      </div>

      <div style={styles.homeHero}>
        <div>
          <span style={styles.homeHeroEyebrow}>ANAIA Intelligence</span>
          <h2 style={styles.homeHeroTitle}>
            Entenda como sua marca aparece, evolui e compete nas IAs.
          </h2>
          <p style={styles.homeHeroText}>
            Pesquisa, monitoramento, benchmark competitivo e insights em uma
            única experiência.
          </p>
        </div>

        <button onClick={onNewDiagnosis} style={styles.homeHeroButton}>
          Iniciar diagnóstico →
        </button>
      </div>

      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>Última empresa</span>
          <strong style={styles.summaryValueSmall}>{companyName}</strong>
          <span style={styles.summaryHint}>Diagnóstico mais recente nesta sessão</span>
        </div>

        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>AI Visibility</span>
          <strong style={styles.summaryValue}>
            {latestScore === null ? '—' : latestScore.toLocaleString('pt-BR', {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
          </strong>
          <span style={styles.summaryHint}>Score consolidado</span>
        </div>

        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>Cobertura de IAs</span>
          <strong style={styles.summaryValue}>
            {latestCoverage === null
              ? '—'
              : `${latestCoverage.toLocaleString('pt-BR', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}%`}
          </strong>
          <span style={styles.summaryHint}>Modelos válidos na última análise</span>
        </div>

        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>Benchmark</span>
          <strong style={styles.summaryValue}>
            {result?.benchmark?.company?.rank
              ? `#${result.benchmark.company.rank}`
              : '—'}
          </strong>
          <span style={styles.summaryHint}>Posição competitiva mais recente</span>
        </div>
      </div>

      <div style={styles.homeColumns}>
        <div style={styles.featurePanel}>
          <div style={styles.featureIcon}>⌕</div>
          <h3 style={styles.featureTitle}>Pesquisa orientada por evidências</h3>
          <p style={styles.featureText}>
            Analise empresas, marcas, setores e concorrentes com a metodologia
            multi-IA do ANAIA.
          </p>
          <button onClick={onNewDiagnosis} style={styles.textButton}>
            Começar pesquisa →
          </button>
        </div>

        <div style={styles.featurePanel}>
          <div style={styles.featureIcon}>↗</div>
          <h3 style={styles.featureTitle}>Monitoramento contínuo</h3>
          <p style={styles.featureText}>
            A evolução temporal será alimentada pelo histórico real dos
            diagnósticos, sem números artificiais.
          </p>
          <span style={styles.statusPill}>Próxima fase</span>
        </div>

        <div style={styles.featurePanel}>
          <div style={styles.featureIcon}>◎</div>
          <h3 style={styles.featureTitle}>Inteligência competitiva</h3>
          <p style={styles.featureText}>
            Compare ranking, gaps e performance relativa entre sua empresa e os
            concorrentes analisados.
          </p>
          <span style={styles.statusPillReady}>Benchmark ativo</span>
        </div>
      </div>
    </div>
  );
};

const MonitoringPage: React.FC = () => {
  const [history, setHistory] = React.useState<HistoryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [selectedCompany, setSelectedCompany] = React.useState('');
  const [period, setPeriod] =
    React.useState<'7' | '30' | '90' | 'all'>('30');

  React.useEffect(() => {
    let active = true;

    const loadHistory = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch('/api/history?limit=500', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        const { data, rawText } = await readApiPayload(response);
        const payload = data as HistoryResponse | null;

        if (!response.ok || !payload?.success) {
          throw new Error(
            payload?.error ||
              rawText ||
              `Erro HTTP ${response.status} ao carregar histórico.`
          );
        }

        if (!active) return;

        const rows = Array.isArray(payload.history)
          ? payload.history
          : [];

        setHistory(rows);

        if (rows.length > 0) {
          const latest = [...rows].sort(
            (a, b) =>
              new Date(b.date).getTime() -
              new Date(a.date).getTime()
          )[0];

          setSelectedCompany(
            (current) => current || latest.company
          );
        }
      } catch (historyError) {
        if (!active) return;

        setError(
          historyError instanceof Error
            ? historyError.message
            : 'Erro ao carregar histórico.'
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    loadHistory();

    return () => {
      active = false;
    };
  }, []);

  const ui: Record<string, React.CSSProperties> = {
    filterBar: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '10px',
      padding: '12px',
      border: '1px solid #e2e8f0',
      background: '#fff',
      borderRadius: '15px',
      marginBottom: '16px',
      boxShadow: '0 7px 24px rgba(15,23,42,.035)',
    },
    filter: {
      height: '40px',
      borderRadius: '10px',
      border: '1px solid #dbe3ef',
      background: '#fff',
      color: '#0f172a',
      padding: '0 12px',
      fontSize: '11px',
      fontWeight: 650,
      outline: 'none',
    },
    updateButton: {
      marginLeft: 'auto',
      minHeight: '40px',
      padding: '0 17px',
      border: 'none',
      borderRadius: '10px',
      background: '#2563eb',
      color: '#fff',
      fontSize: '11px',
      fontWeight: 750,
      cursor: 'pointer',
    },
    kpiGrid: {
      display: 'grid',
      gridTemplateColumns:
        'repeat(auto-fit, minmax(190px, 1fr))',
      gap: '12px',
      marginBottom: '14px',
    },
    kpi: {
      padding: '18px',
      borderRadius: '15px',
      background: '#fff',
      border: '1px solid #e2e8f0',
      boxShadow: '0 8px 24px rgba(15,23,42,.035)',
    },
    kpiLabel: {
      color: '#334155',
      fontSize: '11px',
      fontWeight: 700,
    },
    kpiValue: {
      display: 'block',
      marginTop: '9px',
      color: '#0f172a',
      fontSize: '30px',
      fontWeight: 800,
      letterSpacing: '-1px',
    },
    kpiDelta: {
      display: 'block',
      marginTop: '6px',
      fontSize: '9px',
      lineHeight: 1.4,
    },
    gridMain: {
      display: 'grid',
      gridTemplateColumns:
        'minmax(0, 1.65fr) minmax(280px, .85fr)',
      gap: '14px',
      alignItems: 'start',
    },
    contentStack: {
      display: 'grid',
      gap: '14px',
    },
    twoColumn: {
      display: 'grid',
      gridTemplateColumns:
        'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '14px',
    },
    panel: {
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      padding: '18px',
      boxShadow: '0 8px 26px rgba(15,23,42,.035)',
      minWidth: 0,
    },
    panelTitle: {
      margin: 0,
      color: '#0f172a',
      fontSize: '14px',
      fontWeight: 780,
    },
    panelSubtitle: {
      margin: '4px 0 0',
      color: '#64748b',
      fontSize: '9px',
      lineHeight: 1.5,
    },
    rightStack: {
      display: 'grid',
      gap: '14px',
    },
    execItem: {
      display: 'grid',
      gridTemplateColumns: '32px 1fr',
      gap: '10px',
      padding: '12px 0',
      borderBottom: '1px solid #eef2f7',
    },
    execNumber: {
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#eff6ff',
      color: '#2563eb',
      fontSize: '11px',
      fontWeight: 800,
    },
    alertRow: {
      display: 'grid',
      gridTemplateColumns: '30px 1fr',
      gap: '10px',
      alignItems: 'start',
      padding: '10px 0',
      borderBottom: '1px solid #eef2f7',
    },
    alertDot: {
      width: '26px',
      height: '26px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '11px',
      fontWeight: 800,
    },
    providerTable: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '14px',
      fontSize: '10px',
    },
    th: {
      padding: '9px 8px',
      textAlign: 'left',
      color: '#64748b',
      fontWeight: 700,
      borderBottom: '1px solid #e2e8f0',
    },
    td: {
      padding: '10px 8px',
      borderBottom: '1px solid #eef2f7',
      color: '#334155',
    },
    signalRow: {
      marginTop: '12px',
    },
    signalTop: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '10px',
      fontSize: '10px',
      marginBottom: '5px',
    },
    track: {
      height: '7px',
      borderRadius: '999px',
      overflow: 'hidden',
      background: '#edf2f7',
    },
    fill: {
      height: '100%',
      borderRadius: '999px',
      background: 'linear-gradient(90deg,#2563eb,#60a5fa)',
    },
    methodology: {
      display: 'grid',
      gridTemplateColumns:
        'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '9px',
      marginTop: '14px',
    },
    methodologyItem: {
      padding: '11px',
      borderRadius: '11px',
      background: '#f8fafc',
      border: '1px solid #eef2f7',
    },
  };

  const isFiniteNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value);

  const isValidReading = (item: HistoryItem) =>
    isFiniteNumber(item.score) &&
    item.models_available > 0 &&
    item.observations_count > 0 &&
    isFiniteNumber(item.coverage) &&
    item.coverage > 0;

  const formatNumber = (value: unknown, digits = 1) =>
    isFiniteNumber(value)
      ? value.toLocaleString('pt-BR', {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        })
      : '—';

  const formatDate = (value: string, withTime = false) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleString(
      'pt-BR',
      withTime
        ? {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }
        : {
            day: '2-digit',
            month: '2-digit',
          }
    );
  };

  const companies = React.useMemo(
    () =>
      Array.from(
        new Set(
          history.map((item) => item.company).filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [history]
  );

  const filteredHistory = React.useMemo(() => {
    const now = Date.now();

    const periodMs =
      period === '7'
        ? 7 * 86400000
        : period === '30'
        ? 30 * 86400000
        : period === '90'
        ? 90 * 86400000
        : null;

    return history
      .filter(
        (item) =>
          (!selectedCompany ||
            item.company === selectedCompany) &&
          (!periodMs ||
            now - new Date(item.date).getTime() <= periodMs)
      )
      .sort(
        (a, b) =>
          new Date(a.date).getTime() -
          new Date(b.date).getTime()
      );
  }, [history, selectedCompany, period]);

  const validHistory =
    filteredHistory.filter(isValidReading);

  const latestAttempt =
    filteredHistory[filteredHistory.length - 1] || null;

  const latestValid =
    validHistory[validHistory.length - 1] || null;

  const previousValid =
    validHistory[validHistory.length - 2] || null;

  const delta = (
    current: number | null | undefined,
    previous: number | null | undefined
  ) =>
    isFiniteNumber(current) && isFiniteNumber(previous)
      ? current - previous
      : null;

  const presenceDelta = delta(
    latestValid?.presence,
    previousValid?.presence
  );

  const recommendationDelta = delta(
    latestValid?.recommendation,
    previousValid?.recommendation
  );

  const positionDelta = delta(
    latestValid?.position,
    previousValid?.position
  );

  const consistencyDelta = delta(
    latestValid?.consistency,
    previousValid?.consistency
  );

  const deltaText = (
    value: number | null,
    invert = false
  ) => {
    if (value === null) return 'Sem comparação válida anterior';

    const effective = invert ? -value : value;
    const prefix = value > 0 ? '+' : '';

    return `${prefix}${formatNumber(value)} p.p. vs. leitura anterior`;
  };

  const deltaColor = (
    value: number | null,
    invert = false
  ) => {
    if (value === null || value === 0) return '#64748b';

    const positive = invert ? value < 0 : value > 0;

    return positive ? '#15803d' : '#dc2626';
  };

  const chartRows = validHistory;

  const chartWidth = 720;
  const chartHeight = 225;
  const padX = 42;
  const padTop = 20;
  const padBottom = 36;
  const innerWidth = chartWidth - padX * 2;
  const innerHeight = chartHeight - padTop - padBottom;

  const points = chartRows.map((item, index) => {
    const x =
      chartRows.length <= 1
        ? padX + innerWidth / 2
        : padX +
          (index / (chartRows.length - 1)) * innerWidth;

    const score = isFiniteNumber(item.score)
      ? item.score
      : 0;

    const y =
      padTop +
      (1 - Math.min(Math.max(score, 0), 100) / 100) *
        innerHeight;

    return { x, y, item };
  });

  const polylinePoints = points
    .map((point) => `${point.x},${point.y}`)
    .join(' ');

  const providers =
    latestValid?.providers || {};

  const providerRows = [
    {
      key: 'openai',
      name: 'OpenAI',
      data: providers.openai,
    },
    {
      key: 'gemini',
      name: 'Gemini',
      data: providers.gemini,
    },
    {
      key: 'anthropic',
      name: 'Claude',
      data: providers.anthropic,
    },
  ];

  const execItems = React.useMemo(() => {
    if (!latestValid) return [];

    const metrics = [
      {
        label: 'presença',
        value: latestValid.presence,
      },
      {
        label: 'recomendação',
        value: latestValid.recommendation,
      },
      {
        label: 'consistência',
        value: latestValid.consistency,
      },
      {
        label: 'relevância',
        value: latestValid.relevance,
      },
    ].filter((item) => isFiniteNumber(item.value));

    const ordered = [...metrics].sort(
      (a, b) =>
        Number(b.value) - Number(a.value)
    );

    const strongest = ordered[0];
    const weakest = [...ordered].reverse()[0];

    const items: string[] = [];

    if (strongest) {
      items.push(
        `O sinal mais forte é ${strongest.label}, com ${formatNumber(
          strongest.value,
          0
        )} pontos na última leitura válida.`
      );
    }

    if (weakest) {
      items.push(
        `A maior oportunidade está em ${weakest.label}, atualmente em ${formatNumber(
          weakest.value,
          0
        )} pontos.`
      );
    }

    items.push(
      `A cobertura atual é ${formatNumber(
        latestValid.coverage
      )}% (${latestValid.models_available}/${latestValid.models_requested} IAs), portanto a leitura deve ser interpretada com esse nível de representatividade.`
    );

    return items.slice(0, 3);
  }, [latestValid]);

  const alerts = React.useMemo(() => {
    const rows: Array<{
      tone: 'good' | 'warn' | 'bad';
      text: string;
    }> = [];

    if (!latestValid) return rows;

    if (presenceDelta !== null && Math.abs(presenceDelta) >= 5) {
      rows.push({
        tone: presenceDelta > 0 ? 'good' : 'bad',
        text: `Presença ${
          presenceDelta > 0 ? 'subiu' : 'caiu'
        } ${formatNumber(Math.abs(presenceDelta))} p.p. entre as duas últimas leituras válidas.`,
      });
    }

    if (
      recommendationDelta !== null &&
      Math.abs(recommendationDelta) >= 5
    ) {
      rows.push({
        tone:
          recommendationDelta > 0 ? 'good' : 'bad',
        text: `Recomendação ${
          recommendationDelta > 0 ? 'subiu' : 'caiu'
        } ${formatNumber(
          Math.abs(recommendationDelta)
        )} p.p.`,
      });
    }

    if (latestValid.models_available < latestValid.models_requested) {
      rows.push({
        tone: 'warn',
        text: `Cobertura parcial: ${latestValid.models_available} de ${latestValid.models_requested} IAs responderam na leitura válida mais recente.`,
      });
    }

    if (
      latestAttempt &&
      !isValidReading(latestAttempt)
    ) {
      rows.push({
        tone: 'warn',
        text: `A tentativa mais recente (${formatDate(
          latestAttempt.date,
          true
        )}) não teve cobertura suficiente e foi excluída das métricas.`,
      });
    }

    return rows.slice(0, 4);
  }, [
    latestValid,
    latestAttempt,
    presenceDelta,
    recommendationDelta,
  ]);

  if (loading) {
    return (
      <div style={styles.modulePage}>
        <div style={styles.monitoringEmptyCard}>
          <div style={styles.monitoringSpinner}>◌</div>
          <h2 style={styles.placeholderTitle}>
            Carregando monitoramento...
          </h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.modulePage}>
        <div style={styles.monitoringEmptyCard}>
          <h2 style={styles.placeholderTitle}>
            Não foi possível carregar o monitoramento
          </h2>
          <p style={styles.placeholderText}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.modulePage}>
      <div style={styles.pageHeading}>
        <div>
          <span style={styles.pageEyebrow}>
            Inteligência temporal
          </span>
          <h1 style={styles.pageTitle}>
            Monitoramento contínuo
          </h1>
          <p style={styles.pageSubtitle}>
            Acompanhe como sua marca aparece, evolui e é
            recomendada pelas IAs ao longo do tempo.
          </p>
        </div>
      </div>

      <div style={ui.filterBar}>
        <select
          value={selectedCompany}
          onChange={(event) =>
            setSelectedCompany(event.target.value)
          }
          style={{ ...ui.filter, minWidth: '190px' }}
        >
          {companies.map((company) => (
            <option key={company} value={company}>
              Empresa: {company}
            </option>
          ))}
        </select>

        <select
          value={period}
          onChange={(event) =>
            setPeriod(
              event.target.value as
                | '7'
                | '30'
                | '90'
                | 'all'
            )
          }
          style={ui.filter}
        >
          <option value="7">Período: 7 dias</option>
          <option value="30">Período: 30 dias</option>
          <option value="90">Período: 90 dias</option>
          <option value="all">Período: Tudo</option>
        </select>

        <div style={ui.filter}>
          Modelos: {latestValid?.models_requested ?? 3}
        </div>

        <div style={ui.filter}>
          Leituras válidas: {validHistory.length}
        </div>

        <button
          type="button"
          style={ui.updateButton}
          onClick={() => window.location.reload()}
        >
          Atualizar monitoramento →
        </button>
      </div>

      {!latestValid ? (
        <div style={styles.monitoringEmptyCard}>
          <h2 style={styles.placeholderTitle}>
            Sem leituras válidas neste período
          </h2>
          <p style={styles.placeholderText}>
            Existem diagnósticos salvos, mas nenhum possui
            score com cobertura suficiente para compor o
            monitoramento selecionado.
          </p>
        </div>
      ) : (
        <>
          <div style={ui.kpiGrid}>
            <div style={ui.kpi}>
              <span style={ui.kpiLabel}>Presença nas IAs</span>
              <strong style={ui.kpiValue}>
                {formatNumber(latestValid.presence, 0)}
              </strong>
              <span
                style={{
                  ...ui.kpiDelta,
                  color: deltaColor(presenceDelta),
                }}
              >
                {deltaText(presenceDelta)}
              </span>
            </div>

            <div style={ui.kpi}>
              <span style={ui.kpiLabel}>
                Taxa de recomendação
              </span>
              <strong style={ui.kpiValue}>
                {formatNumber(
                  latestValid.recommendation,
                  0
                )}
              </strong>
              <span
                style={{
                  ...ui.kpiDelta,
                  color: deltaColor(
                    recommendationDelta
                  ),
                }}
              >
                {deltaText(recommendationDelta)}
              </span>
            </div>

            <div style={ui.kpi}>
              <span style={ui.kpiLabel}>Posição</span>
              <strong style={ui.kpiValue}>
                {formatNumber(latestValid.position, 0)}
              </strong>
              <span
                style={{
                  ...ui.kpiDelta,
                  color: deltaColor(positionDelta, true),
                }}
              >
                {deltaText(positionDelta, true)}
              </span>
            </div>

            <div style={ui.kpi}>
              <span style={ui.kpiLabel}>Consistência</span>
              <strong style={ui.kpiValue}>
                {formatNumber(
                  latestValid.consistency,
                  0
                )}
              </strong>
              <span
                style={{
                  ...ui.kpiDelta,
                  color: deltaColor(
                    consistencyDelta
                  ),
                }}
              >
                {deltaText(consistencyDelta)}
              </span>
            </div>
          </div>

          <div style={ui.gridMain}>
            <div style={ui.contentStack}>
              <div style={ui.twoColumn}>
                <div style={ui.panel}>
                  <h2 style={ui.panelTitle}>
                    Evolução do AI Visibility
                  </h2>
                  <p style={ui.panelSubtitle}>
                    Score consolidado das leituras válidas no
                    período selecionado.
                  </p>

                  <div style={{ overflowX: 'auto', marginTop: '10px' }}>
                    <svg
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                      width="100%"
                      height="245"
                      style={{
                        display: 'block',
                        minWidth: '560px',
                      }}
                    >
                      {[0, 25, 50, 75, 100].map(
                        (tick) => {
                          const y =
                            padTop +
                            (1 - tick / 100) *
                              innerHeight;

                          return (
                            <g key={tick}>
                              <line
                                x1={padX}
                                x2={
                                  chartWidth - padX
                                }
                                y1={y}
                                y2={y}
                                stroke="#e2e8f0"
                              />
                              <text
                                x={7}
                                y={y + 4}
                                fontSize="9"
                                fill="#94a3b8"
                              >
                                {tick}
                              </text>
                            </g>
                          );
                        }
                      )}

                      {points.length > 1 && (
                        <polyline
                          points={polylinePoints}
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {points.map(
                        (point, index) => (
                          <g
                            key={`${point.item.id}-${index}`}
                          >
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="5"
                              fill="#fff"
                              stroke="#2563eb"
                              strokeWidth="3"
                            />
                            <text
                              x={point.x}
                              y={Math.max(
                                point.y - 10,
                                11
                              )}
                              textAnchor="middle"
                              fontSize="9"
                              fontWeight="700"
                              fill="#0f172a"
                            >
                              {formatNumber(
                                point.item.score
                              )}
                            </text>
                            <text
                              x={point.x}
                              y={
                                chartHeight - 10
                              }
                              textAnchor="middle"
                              fontSize="8"
                              fill="#64748b"
                            >
                              {formatDate(
                                point.item.date
                              )}
                            </text>
                          </g>
                        )
                      )}
                    </svg>
                  </div>
                </div>

                <div style={ui.panel}>
                  <h2 style={ui.panelTitle}>
                    Recomendação por modelo
                  </h2>
                  <p style={ui.panelSubtitle}>
                    Percentual de recomendação por IA na última leitura válida.
                  </p>

                  <div
                    style={{
                      marginTop: '18px',
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(3, minmax(90px, 1fr))',
                      gap: '12px',
                      alignItems: 'end',
                      minHeight: '190px',
                    }}
                  >
                    {[
                      {
                        key: 'openai',
                        label: 'OpenAI',
                        data: providers.openai,
                      },
                      {
                        key: 'gemini',
                        label: 'Gemini',
                        data: providers.gemini,
                      },
                      {
                        key: 'anthropic',
                        label: 'Claude',
                        data: providers.anthropic,
                      },
                    ].map(({ key, label, data }) => {
                      /*
                        Ainda não persistimos "recommendation" por provedor.
                        Por isso este bloco não usa score do modelo como substituto:
                        evita apresentar uma métrica incorreta como recomendação.
                      */
                      const recommendationValue = null;

                      return (
                        <div
                          key={key}
                          style={{
                            display: 'grid',
                            gap: '8px',
                            alignItems: 'end',
                            textAlign: 'center',
                          }}
                        >
                          <div
                            style={{
                              height: '130px',
                              borderRadius: '10px',
                              background: '#f8fafc',
                              border: '1px solid #eef2f7',
                              display: 'flex',
                              alignItems: 'flex-end',
                              justifyContent: 'center',
                              padding: '8px',
                            }}
                          >
                            <div
                              style={{
                                width: '42px',
                                height:
                                  recommendationValue === null
                                    ? '8px'
                                    : `${Math.max(
                                        8,
                                        Math.min(
                                          100,
                                          recommendationValue
                                        )
                                      )}%`,
                                borderRadius: '8px 8px 4px 4px',
                                background:
                                  recommendationValue === null
                                    ? '#cbd5e1'
                                    : 'linear-gradient(180deg,#60a5fa,#2563eb)',
                                transition: 'height .4s ease',
                              }}
                            />
                          </div>

                          <strong
                            style={{
                              fontSize: '11px',
                              color: '#0f172a',
                            }}
                          >
                            {label}
                          </strong>

                          <span
                            style={{
                              fontSize: '9px',
                              color: data?.success
                                ? '#64748b'
                                : data?.error_code === '001'
                                ? '#b45309'
                                : '#94a3b8',
                              lineHeight: 1.35,
                            }}
                          >
                            {data?.success
                              ? 'Recomendação por modelo ainda não persistida'
                              : data?.error_code === '001'
                              ? 'Fora do ar 001'
                              : 'Sem dados'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      marginTop: '12px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      color: '#64748b',
                      fontSize: '9px',
                      lineHeight: 1.45,
                    }}
                  >
                    Para mostrar percentuais reais por OpenAI, Gemini e Claude,
                    o próximo passo será persistir as dimensões de cada modelo
                    em cada diagnóstico. O ANAIA não usa o score geral do
                    provedor como substituto da taxa de recomendação.
                  </div>
                </div>
              </div>

              <div style={ui.twoColumn}>
                <div style={ui.panel}>
                  <h2 style={ui.panelTitle}>
                    Temas com maior ganho de visibilidade
                  </h2>
                  <p style={ui.panelSubtitle}>
                    Variação de presença por tema no período selecionado.
                  </p>

                  <div
                    style={{
                      marginTop: '18px',
                      minHeight: '210px',
                      display: 'grid',
                      alignContent: 'center',
                      justifyItems: 'center',
                      textAlign: 'center',
                      padding: '20px',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      border: '1px dashed #cbd5e1',
                    }}
                  >
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#eff6ff',
                        color: '#2563eb',
                        fontWeight: 800,
                        marginBottom: '10px',
                      }}
                    >
                      ↗
                    </div>

                    <strong
                      style={{
                        fontSize: '12px',
                        color: '#0f172a',
                      }}
                    >
                      Dados temáticos ainda não disponíveis
                    </strong>

                    <p
                      style={{
                        margin: '7px 0 0',
                        maxWidth: '360px',
                        color: '#64748b',
                        fontSize: '9px',
                        lineHeight: 1.5,
                      }}
                    >
                      O histórico atual salva score e dimensões consolidadas,
                      mas ainda não salva o tema de cada prompt. Quando
                      persistirmos as observações, este painel mostrará ganhos
                      e perdas reais por assunto.
                    </p>
                  </div>
                </div>

                <div style={ui.panel}>
                  <h2 style={ui.panelTitle}>
                    Monitoramento por prompt
                  </h2>
                  <p style={ui.panelSubtitle}>
                    Presença e recomendação por categoria de pergunta e modelo.
                  </p>

                  <div
                    style={{
                      overflowX: 'auto',
                      marginTop: '14px',
                    }}
                  >
                    <table style={ui.providerTable}>
                      <thead>
                        <tr>
                          <th style={ui.th}>Categoria de prompt</th>
                          <th style={ui.th}>OpenAI</th>
                          <th style={ui.th}>Gemini</th>
                          <th style={ui.th}>Claude</th>
                        </tr>
                      </thead>

                      <tbody>
                        {[
                          'Marca / empresa',
                          'Produto / serviço',
                          'Recomendação',
                          'Comparação competitiva',
                          'Intenção de compra',
                        ].map((promptCategory) => (
                          <tr key={promptCategory}>
                            <td style={ui.td}>
                              <strong>{promptCategory}</strong>
                            </td>
                            <td style={ui.td}>—</td>
                            <td style={ui.td}>—</td>
                            <td style={ui.td}>—</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div
                    style={{
                      marginTop: '12px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      color: '#92400e',
                      fontSize: '9px',
                      lineHeight: 1.45,
                    }}
                  >
                    As categorias acima são apenas a estrutura visual do módulo.
                    Nenhum percentual é exibido até o ANAIA persistir as
                    observações e categorias reais de cada prompt.
                  </div>
                </div>
              </div>
            </div>

            <aside style={ui.rightStack}>
              <div style={ui.panel}>
                <h2 style={ui.panelTitle}>
                  Leitura executiva
                </h2>
                <p style={ui.panelSubtitle}>
                  Principais conclusões da leitura mais
                  recente.
                </p>

                {execItems.map((item, index) => (
                  <div
                    key={item}
                    style={ui.execItem}
                  >
                    <div style={ui.execNumber}>
                      {index + 1}
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        lineHeight: 1.55,
                        color: '#334155',
                      }}
                    >
                      {item}
                    </div>
                  </div>
                ))}
              </div>

              <div style={ui.panel}>
                <h2 style={ui.panelTitle}>
                  Alertas e sinais
                </h2>
                <p style={ui.panelSubtitle}>
                  Mudanças e limitações que merecem atenção.
                </p>

                {alerts.length > 0 ? (
                  alerts.map((alert, index) => {
                    const palette =
                      alert.tone === 'good'
                        ? {
                            bg: '#f0fdf4',
                            color: '#15803d',
                            icon: '↑',
                          }
                        : alert.tone === 'bad'
                        ? {
                            bg: '#fef2f2',
                            color: '#dc2626',
                            icon: '↓',
                          }
                        : {
                            bg: '#fffbeb',
                            color: '#b45309',
                            icon: '!',
                          };

                    return (
                      <div
                        key={`${alert.text}-${index}`}
                        style={ui.alertRow}
                      >
                        <div
                          style={{
                            ...ui.alertDot,
                            background: palette.bg,
                            color: palette.color,
                          }}
                        >
                          {palette.icon}
                        </div>

                        <div
                          style={{
                            color: '#334155',
                            fontSize: '10px',
                            lineHeight: 1.5,
                          }}
                        >
                          {alert.text}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p
                    style={{
                      ...ui.panelSubtitle,
                      marginTop: '14px',
                    }}
                  >
                    Ainda não há variações suficientes para
                    gerar alertas históricos.
                  </p>
                )}
              </div>

              <div
                style={{
                  ...ui.panel,
                  background:
                    'linear-gradient(135deg,#eff6ff,#dbeafe)',
                }}
              >
                <span style={styles.pageEyebrow}>
                  ANAIA
                </span>
                <h2
                  style={{
                    ...ui.panelTitle,
                    fontSize: '17px',
                    marginTop: '6px',
                  }}
                >
                  Monitorar hoje.
                  <br />
                  Agir antes do mercado.
                </h2>
                <p
                  style={{
                    ...ui.panelSubtitle,
                    marginTop: '8px',
                  }}
                >
                  Última leitura válida:{' '}
                  {formatDate(
                    latestValid.date,
                    true
                  )}
                </p>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
};
const ModulePlaceholder: React.FC<{
  title: string;
  subtitle: string;
  eyebrow: string;
  children?: React.ReactNode;
}> = ({ title, subtitle, eyebrow, children }) => (
  <div style={styles.modulePage}>
    <div style={styles.pageHeading}>
      <div>
        <span style={styles.pageEyebrow}>{eyebrow}</span>
        <h1 style={styles.pageTitle}>{title}</h1>
        <p style={styles.pageSubtitle}>{subtitle}</p>
      </div>
    </div>

    {children ?? (
      <div style={styles.placeholderCard}>
        <div style={styles.placeholderIcon}>✦</div>
        <h2 style={styles.placeholderTitle}>Módulo preparado para a próxima fase</h2>
        <p style={styles.placeholderText}>
          A navegação já está integrada. Agora vamos conectar este módulo aos
          dados históricos reais do ANAIA.
        </p>
      </div>
    )}
  </div>
);

const DiagnosisInputPage: React.FC<{
  onAnalyze: (data: any) => Promise<void>;
  onBack: () => void;
}> = ({ onAnalyze, onBack }) => {
  const [query, setQuery] = useState('');
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
    <div style={{ ...styles.inputPage, maxWidth: '880px' }}>
      <div style={styles.pageHeading}>
        <div>
          <span style={styles.pageEyebrow}>Pesquisa</span>
          <h1 style={styles.pageTitle}>Pesquisa orientada por evidências</h1>
          <p style={styles.pageSubtitle}>
            Pesquise uma empresa, marca, produto ou serviço e veja como ele aparece nas principais IAs.
          </p>
        </div>
        <button onClick={onBack} style={{ ...styles.backButton, marginBottom: 0 }}>
          ← Início
        </button>
      </div>

      <div style={styles.inputCard}>
        <h1 style={{ marginTop: 0 }}>Novo Diagnóstico</h1>
        <p style={styles.inputSubtitle}>
          Digite o nome de uma empresa, marca, produto ou serviço. O ANAIA fará a análise automaticamente.
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
            placeholder="Ex.: Nike, Nubank, iPhone 17, software de FP&A..."
            style={styles.searchInput}
            disabled={loading}
            autoFocus
          />
          <span style={styles.helperText}>
            Pode ser uma empresa, marca, produto ou serviço.
          </span>
          {errors.query && <span style={styles.error}>{errors.query}</span>}
        </div>

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
  const [page, setPage] = React.useState<Page>('landing');
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
          setPage('landing');
          return;
        }

        const { data } = await readApiPayload(response);

        if (data?.success && data?.authenticated && data?.user) {
          setUser({
            id: data.user.id,
            email: data.user.email || '',
          });
          setPage('home');
        } else {
          setUser(null);
          setPage('landing');
        }
      } catch (error) {
        console.error('Session check error:', error);

        if (active) {
          setUser(null);
          setPage('landing');
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
    setPage('home');
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
      setPage('landing');
    }
  };

  const handleNewDiagnosis = () => {
    setPage('research');
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

      const { data: responseData, rawText } =
        await readApiPayload(response);

      if (!response.ok) {
        const serverMessage =
          responseData?.error ||
          responseData?.message ||
          rawText ||
          `Erro HTTP ${response.status} ao processar diagnóstico`;

        throw new Error(serverMessage);
      }

      if (!responseData) {
        throw new Error(
          'O servidor respondeu em um formato inesperado. Tente novamente.'
        );
      }

      const diagnosticResult = responseData;

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
        setPage('research');
        alert('A análise ultrapassou 110 segundos. Tente novamente em alguns instantes.');
        return;
      }

      setPage('home');

      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao processar diagnóstico';

      alert(
        message.includes('An error occurred') ||
        message.includes('FUNCTION_INVOCATION') ||
        message.includes('Gateway') ||
        message.includes('504')
          ? 'O servidor não conseguiu concluir a análise em produção. Tente novamente em alguns instantes.'
          : message
      );
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const handleBack = () => {
    if (page === 'result' || page === 'research') {
      setPage('home');
    } else if (page === 'processing') {
      setPage('research');
    }
  };

  const handleNavigate = (nextPage: Page) => {
    if (nextPage === 'login' || nextPage === 'signup') {
      return;
    }

    setPage(nextPage);
  };

  if (checkingSession) {
    return (
      <div style={styles.publicLoading}>
        <span style={styles.brandMark}>A</span>
        <strong style={styles.brandName}>ANAIA</strong>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      {page === 'landing' && (
        <PublicLandingPage
          onLogin={() => setPage('login')}
        />
      )}

      {page === 'login' && <LoginPage onLogin={handleLogin} />}
      {page === 'signup' && <LoginPage onLogin={handleLogin} />}

      {user &&
        page !== 'landing' &&
        page !== 'login' &&
        page !== 'signup' && (
        <>
          <TopNavigation
            page={page}
            user={user}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
          />

          <main style={styles.shellContent}>
            {page === 'home' && (
              <HomePage
                onNewDiagnosis={handleNewDiagnosis}
                result={result}
              />
            )}

            {page === 'research' && (
              <DiagnosisInputPage
                onAnalyze={handleAnalyze}
                onBack={handleBack}
              />
            )}

            {page === 'monitoring' && (
              <MonitoringPage />
            )}

            {page === 'comparisons' && (
              <ModulePlaceholder
                eyebrow="Inteligência competitiva"
                title="Comparativos"
                subtitle="Compare sua posição com concorrentes usando a mesma metodologia ANAIA."
              >
                {result?.benchmark?.ranking?.length ? (
                  <div style={styles.placeholderCard}>
                    <h2 style={styles.placeholderTitle}>Último benchmark disponível</h2>
                    <div style={styles.quickRanking}>
                      {result.benchmark.ranking.map((entry: any) => (
                        <div key={`${entry.name}-${entry.rank}`} style={styles.quickRankingRow}>
                          <strong>#{entry.rank}</strong>
                          <span style={{ flex: 1 }}>{entry.name}</span>
                          <strong>
                            {typeof entry.score === 'number'
                              ? entry.score.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 1,
                                  maximumFractionDigits: 1,
                                })
                              : '—'}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : undefined}
              </ModulePlaceholder>
            )}

            {page === 'insights' && (
              <ModulePlaceholder
                eyebrow="Decisão"
                title="Insights"
                subtitle="Transforme sinais e evidências em prioridades acionáveis."
              />
            )}

            {page === 'reports' && (
              <ModulePlaceholder
                eyebrow="Comunicação executiva"
                title="Relatórios"
                subtitle="Consolide análises em relatórios claros e compartilháveis."
              />
            )}

            {page === 'library' && (
              <ModulePlaceholder
                eyebrow="Conhecimento"
                title="Biblioteca"
                subtitle="Organize diagnósticos, estudos e relatórios anteriores."
              />
            )}

            {page === 'processing' && (
              <ProcessingPage company={currentCompany} />
            )}

            {page === 'result' && result && (
              <ResultPage result={result} onBack={handleBack} />
            )}
          </main>
        </>
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

  topNav: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: '72px',
    background: 'rgba(255,255,255,.96)',
    backdropFilter: 'blur(18px)',
    borderBottom: '1px solid #e2e8f0',
    boxShadow: '0 8px 30px rgba(15,23,42,.05)',
  },
  topNavInner: {
    maxWidth: '1440px',
    height: '72px',
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  brandButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    padding: 0,
    minWidth: '150px',
    textAlign: 'left',
  },
  brandMark: {
    width: '36px',
    height: '36px',
    borderRadius: '11px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    color: '#fff',
    fontWeight: 900,
    fontSize: '19px',
    boxShadow: '0 8px 20px rgba(37,99,235,.22)',
  },
  brandName: {
    display: 'block',
    color: '#0f172a',
    fontSize: '16px',
    letterSpacing: '.4px',
    lineHeight: 1.1,
  },
  brandSubtitle: {
    display: 'block',
    color: '#64748b',
    fontSize: '9px',
    marginTop: '2px',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flex: 1,
    overflowX: 'auto',
    scrollbarWidth: 'none',
  },
  navButton: {
    padding: '10px 11px',
    border: 'none',
    borderRadius: '9px',
    background: 'transparent',
    color: '#64748b',
    fontSize: '12px',
    fontWeight: 650,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  navButtonActive: {
    background: '#eff6ff',
    color: '#1d4ed8',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  notificationButton: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#334155',
    cursor: 'pointer',
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    padding: '5px 8px',
    borderRadius: '12px',
    background: '#f8fafc',
  },
  userAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#dbeafe',
    color: '#1d4ed8',
    fontWeight: 800,
    fontSize: '12px',
  },
  userIdentity: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '160px',
  },
  userEmail: {
    fontSize: '10px',
    color: '#0f172a',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userRole: {
    fontSize: '9px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  topLogoutButton: {
    padding: '8px 10px',
    borderRadius: '9px',
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#475569',
    fontSize: '11px',
    cursor: 'pointer',
  },
  shellContent: {
    paddingTop: '72px',
    minHeight: '100vh',
    background:
      'radial-gradient(circle at 50% 0%, rgba(37,99,235,.045), transparent 32%), #f8fafc',
  },
  modulePage: {
    maxWidth: '1240px',
    margin: '0 auto',
    padding: '38px 24px 64px',
  },
  pageHeading: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '20px',
    marginBottom: '24px',
  },
  pageEyebrow: {
    display: 'block',
    color: '#2563eb',
    fontSize: '10px',
    fontWeight: 800,
    letterSpacing: '1.2px',
    textTransform: 'uppercase',
    marginBottom: '7px',
  },
  pageTitle: {
    margin: 0,
    fontSize: '34px',
    letterSpacing: '-1.1px',
    color: '#0f172a',
  },
  pageSubtitle: {
    margin: '8px 0 0',
    color: '#64748b',
    fontSize: '14px',
    lineHeight: 1.6,
    maxWidth: '760px',
  },
  primaryCompactButton: {
    border: 'none',
    borderRadius: '10px',
    padding: '11px 16px',
    background: '#2563eb',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  homeHero: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '30px',
    padding: '34px',
    borderRadius: '22px',
    background:
      'radial-gradient(circle at 90% 20%, rgba(59,130,246,.28), transparent 30%), linear-gradient(135deg,#0f172a,#172554 60%,#1d4ed8 140%)',
    color: '#fff',
    boxShadow: '0 20px 60px rgba(15,23,42,.14)',
  },
  homeHeroEyebrow: {
    display: 'block',
    color: '#bfdbfe',
    fontSize: '10px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '1.2px',
    marginBottom: '9px',
  },
  homeHeroTitle: {
    margin: 0,
    maxWidth: '760px',
    fontSize: '30px',
    lineHeight: 1.08,
    letterSpacing: '-1px',
  },
  homeHeroText: {
    color: '#dbeafe',
    fontSize: '13px',
    lineHeight: 1.6,
    margin: '12px 0 0',
    maxWidth: '720px',
  },
  homeHeroButton: {
    flexShrink: 0,
    border: '1px solid rgba(255,255,255,.18)',
    background: 'rgba(255,255,255,.12)',
    color: '#fff',
    borderRadius: '12px',
    padding: '13px 17px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '12px',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px,1fr))',
    gap: '14px',
    marginTop: '16px',
  },
  summaryCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '19px',
    boxShadow: '0 8px 24px rgba(15,23,42,.04)',
  },
  summaryLabel: {
    display: 'block',
    fontSize: '10px',
    color: '#64748b',
    marginBottom: '9px',
  },
  summaryValue: {
    display: 'block',
    fontSize: '27px',
    letterSpacing: '-.8px',
    color: '#0f172a',
  },
  summaryValueSmall: {
    display: 'block',
    fontSize: '16px',
    color: '#0f172a',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  summaryHint: {
    display: 'block',
    fontSize: '9px',
    color: '#94a3b8',
    marginTop: '8px',
  },
  homeColumns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px,1fr))',
    gap: '14px',
    marginTop: '16px',
  },
  featurePanel: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '22px',
  },
  featureIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '11px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#eff6ff',
    color: '#2563eb',
    fontWeight: 800,
    fontSize: '18px',
  },
  featureTitle: {
    margin: '15px 0 7px',
    fontSize: '15px',
    color: '#0f172a',
  },
  featureText: {
    margin: 0,
    color: '#64748b',
    fontSize: '11px',
    lineHeight: 1.6,
  },
  textButton: {
    marginTop: '15px',
    padding: 0,
    border: 'none',
    background: 'transparent',
    color: '#2563eb',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  statusPill: {
    display: 'inline-block',
    marginTop: '15px',
    padding: '5px 8px',
    borderRadius: '999px',
    background: '#fffbeb',
    color: '#b45309',
    fontSize: '9px',
    fontWeight: 750,
  },
  statusPillReady: {
    display: 'inline-block',
    marginTop: '15px',
    padding: '5px 8px',
    borderRadius: '999px',
    background: '#f0fdf4',
    color: '#15803d',
    fontSize: '9px',
    fontWeight: 750,
  },
  placeholderCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '18px',
    padding: '32px',
    boxShadow: '0 10px 30px rgba(15,23,42,.04)',
  },
  placeholderIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '13px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#eff6ff',
    color: '#2563eb',
    fontSize: '20px',
  },
  placeholderTitle: {
    margin: '14px 0 6px',
    fontSize: '18px',
    color: '#0f172a',
  },
  placeholderText: {
    margin: 0,
    maxWidth: '700px',
    color: '#64748b',
    fontSize: '12px',
    lineHeight: 1.6,
  },
  quickRanking: {
    display: 'grid',
    gap: '8px',
    marginTop: '18px',
  },
  quickRankingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '11px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    fontSize: '12px',
  },

  monitoringFilterWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '8px 10px',
  },
  monitoringFilterLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '.6px',
  },
  monitoringSelect: {
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: '#0f172a',
    fontSize: '12px',
    fontWeight: 700,
    minWidth: '150px',
    cursor: 'pointer',
  },
  monitoringEmptyCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '18px',
    padding: '36px',
    boxShadow: '0 10px 30px rgba(15,23,42,.04)',
  },
  monitoringSpinner: {
    width: '44px',
    height: '44px',
    borderRadius: '13px',
    background: '#eff6ff',
    color: '#2563eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  monitoringStatusIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '13px',
    background: '#eff6ff',
    color: '#2563eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 800,
  },
  monitoringHero: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '24px',
    flexWrap: 'wrap',
    padding: '30px',
    borderRadius: '22px',
    background: 'radial-gradient(circle at 90% 10%, rgba(59,130,246,.28), transparent 30%), linear-gradient(135deg,#0f172a,#172554 58%,#1d4ed8 140%)',
    color: '#ffffff',
    boxShadow: '0 20px 60px rgba(15,23,42,.13)',
  },
  monitoringHeroEyebrow: {
    display: 'block',
    fontSize: '10px',
    fontWeight: 800,
    color: '#bfdbfe',
    letterSpacing: '1.2px',
    textTransform: 'uppercase',
    marginBottom: '8px',
  },
  monitoringHeroScore: {
    fontSize: '58px',
    lineHeight: .95,
    fontWeight: 850,
    letterSpacing: '-3px',
  },
  monitoringHeroCaption: {
    color: '#dbeafe',
    fontSize: '12px',
    marginTop: '9px',
  },
  monitoringHeroDelta: {
    fontSize: '11px',
    fontWeight: 750,
    marginTop: '8px',
  },
  monitoringHeroMetaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(120px,1fr))',
    gap: '10px',
    minWidth: '290px',
  },
  monitoringHeroMeta: {
    padding: '13px 14px',
    borderRadius: '13px',
    border: '1px solid rgba(255,255,255,.15)',
    background: 'rgba(255,255,255,.09)',
  },
  monitoringHeroMetaLabel: {
    display: 'block',
    fontSize: '9px',
    color: '#bfdbfe',
    marginBottom: '4px',
  },
  monitoringHeroMetaValue: {
    fontSize: '16px',
  },
  monitoringKpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px,1fr))',
    gap: '14px',
  },
  monitoringKpiCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '19px',
    boxShadow: '0 8px 24px rgba(15,23,42,.035)',
  },
  monitoringKpiLabel: {
    display: 'block',
    color: '#64748b',
    fontSize: '10px',
    marginBottom: '8px',
  },
  monitoringKpiValue: {
    display: 'block',
    color: '#0f172a',
    fontSize: '28px',
    letterSpacing: '-.8px',
  },
  monitoringKpiHint: {
    display: 'block',
    color: '#94a3b8',
    fontSize: '9px',
    lineHeight: 1.45,
    marginTop: '7px',
  },
  monitoringMainGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.65fr) minmax(280px, .85fr)',
    gap: '16px',
  },
  monitoringPanel: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '18px',
    padding: '22px',
    boxShadow: '0 10px 30px rgba(15,23,42,.04)',
  },
  monitoringPanelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '18px',
  },
  monitoringPanelTitle: {
    margin: 0,
    fontSize: '16px',
    color: '#0f172a',
    letterSpacing: '-.25px',
  },
  monitoringPanelSubtitle: {
    margin: '5px 0 0',
    fontSize: '10px',
    color: '#64748b',
    lineHeight: 1.5,
  },
  monitoringPill: {
    padding: '6px 9px',
    borderRadius: '999px',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#1d4ed8',
    fontSize: '9px',
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },
  monitoringSignalRow: {
    display: 'grid',
    gap: '7px',
  },
  monitoringSignalTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '11px',
    color: '#334155',
  },
  monitoringTrack: {
    height: '7px',
    borderRadius: '999px',
    background: '#eef2f7',
    overflow: 'hidden',
  },
  monitoringFill: {
    height: '100%',
    borderRadius: '999px',
    background: 'linear-gradient(90deg,#2563eb,#60a5fa)',
  },
  monitoringTable: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '760px',
    fontSize: '11px',
  },
  monitoringTh: {
    textAlign: 'left',
    padding: '10px 12px',
    color: '#64748b',
    fontWeight: 750,
    borderBottom: '1px solid #e2e8f0',
    background: '#f8fafc',
    whiteSpace: 'nowrap',
  },
  monitoringTd: {
    padding: '12px',
    color: '#334155',
    borderBottom: '1px solid #f1f5f9',
    whiteSpace: 'nowrap',
  },
  monitoringFootnote: {
    padding: '13px 15px',
    borderRadius: '13px',
    border: '1px solid #dbeafe',
    background: '#eff6ff',
    color: '#1e3a8a',
    fontSize: '10px',
    lineHeight: 1.5,
  },

  // Public landing page
  publicPage: {
    minHeight: '100vh',
    background: '#ffffff',
    color: '#0f172a',
  },
  publicLoading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    background: '#ffffff',
  },
  publicHeader: {
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    background: 'rgba(255,255,255,.92)',
    backdropFilter: 'blur(18px)',
    borderBottom: '1px solid #eef2f7',
  },
  publicHeaderInner: {
    maxWidth: '1180px',
    height: '76px',
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '28px',
  },
  publicBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    border: 'none',
    background: 'transparent',
    textDecoration: 'none',
    minWidth: '155px',
  },
  publicNav: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '26px',
  },
  publicNavLink: {
    border: 'none',
    background: 'transparent',
    color: '#475569',
    fontSize: '12px',
    fontWeight: 650,
    cursor: 'pointer',
    padding: 0,
  },
  publicNavAnchor: {
    color: '#475569',
    fontSize: '12px',
    fontWeight: 650,
    textDecoration: 'none',
  },
  publicHeaderActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  publicLoginButton: {
    border: 'none',
    background: 'transparent',
    color: '#334155',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    padding: '10px 12px',
  },
  publicPrimaryButton: {
    border: 'none',
    borderRadius: '10px',
    padding: '11px 16px',
    background: '#2563eb',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 750,
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(37,99,235,.18)',
  },
  publicHeroSection: {
    background:
      'radial-gradient(circle at 80% 12%, rgba(37,99,235,.13), transparent 27%), linear-gradient(180deg,#ffffff 0%,#f8fbff 100%)',
    borderBottom: '1px solid #eef2f7',
  },
  publicHeroGrid: {
    maxWidth: '1180px',
    minHeight: '650px',
    margin: '0 auto',
    padding: '74px 24px 82px',
    display: 'grid',
    gridTemplateColumns: 'minmax(0,1fr) minmax(440px,.9fr)',
    gap: '68px',
    alignItems: 'center',
  },
  publicHeroCopy: {
    minWidth: 0,
  },
  publicHeroPill: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '7px 10px',
    borderRadius: '999px',
    background: '#eff6ff',
    border: '1px solid #dbeafe',
    color: '#1d4ed8',
    fontSize: '10px',
    fontWeight: 850,
    letterSpacing: '1px',
  },
  publicHeroTitle: {
    margin: '22px 0 0',
    maxWidth: '690px',
    fontSize: '56px',
    lineHeight: 1.02,
    letterSpacing: '-2.4px',
    fontWeight: 820,
    color: '#0f172a',
  },
  publicHeroTitleAccent: {
    color: '#2563eb',
  },
  publicHeroText: {
    maxWidth: '650px',
    margin: '22px 0 0',
    color: '#475569',
    fontSize: '17px',
    lineHeight: 1.7,
  },
  publicHeroActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginTop: '30px',
  },
  publicHeroPrimary: {
    border: 'none',
    borderRadius: '11px',
    padding: '14px 20px',
    background: '#2563eb',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 780,
    cursor: 'pointer',
    boxShadow: '0 12px 30px rgba(37,99,235,.20)',
  },
  publicHeroSecondary: {
    border: '1px solid #dbe3ef',
    borderRadius: '11px',
    padding: '14px 20px',
    background: '#ffffff',
    color: '#334155',
    fontSize: '13px',
    fontWeight: 720,
    cursor: 'pointer',
  },
  publicTrustRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    marginTop: '25px',
    color: '#64748b',
    fontSize: '10px',
    fontWeight: 650,
  },
  publicProductPreview: {
    padding: '20px',
    borderRadius: '24px',
    background:
      'linear-gradient(145deg,#0f172a 0%,#172554 60%,#1d4ed8 145%)',
    color: '#ffffff',
    boxShadow: '0 34px 80px rgba(15,23,42,.20)',
    transform: 'rotate(1deg)',
  },
  previewTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '14px',
  },
  previewEyebrow: {
    display: 'block',
    color: '#93c5fd',
    fontSize: '8px',
    fontWeight: 850,
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  previewTitle: {
    display: 'block',
    marginTop: '5px',
    fontSize: '16px',
  },
  previewLive: {
    padding: '6px 8px',
    borderRadius: '999px',
    background: 'rgba(34,197,94,.12)',
    color: '#86efac',
    fontSize: '8px',
    fontWeight: 750,
  },
  previewScoreArea: {
    display: 'grid',
    gridTemplateColumns: '150px 1fr',
    gap: '14px',
    marginTop: '22px',
  },
  previewScoreLabel: {
    display: 'block',
    color: '#bfdbfe',
    fontSize: '9px',
  },
  previewScore: {
    display: 'block',
    marginTop: '4px',
    fontSize: '58px',
    lineHeight: .95,
    letterSpacing: '-3px',
  },
  previewScoreHint: {
    display: 'block',
    marginTop: '7px',
    color: '#cbd5e1',
    fontSize: '8px',
  },
  previewMiniGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2,1fr)',
    gap: '8px',
  },
  previewMiniCard: {
    display: 'grid',
    gap: '5px',
    padding: '10px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,.08)',
    border: '1px solid rgba(255,255,255,.10)',
    fontSize: '8px',
    color: '#bfdbfe',
  },
  previewChart: {
    marginTop: '14px',
    padding: '14px',
    borderRadius: '14px',
    background: '#ffffff',
    color: '#0f172a',
  },
  previewChartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    marginBottom: '12px',
    color: '#64748b',
    fontSize: '8px',
  },
  previewSignalRow: {
    display: 'grid',
    gridTemplateColumns: '92px 1fr 28px',
    gap: '8px',
    alignItems: 'center',
    marginTop: '10px',
    fontSize: '8px',
  },
  previewTrack: {
    height: '6px',
    borderRadius: '999px',
    background: '#e2e8f0',
    overflow: 'hidden',
  },
  previewFill: {
    height: '100%',
    borderRadius: '999px',
    background: 'linear-gradient(90deg,#2563eb,#60a5fa)',
  },
  previewFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '14px',
    marginTop: '12px',
    padding: '12px',
    borderRadius: '11px',
    background: 'rgba(255,255,255,.08)',
    color: '#dbeafe',
    fontSize: '8px',
  },
  publicSection: {
    maxWidth: '1180px',
    margin: '0 auto',
    padding: '92px 24px',
  },
  publicSectionHeading: {
    maxWidth: '720px',
    margin: '0 auto',
    textAlign: 'center',
  },
  publicSectionEyebrow: {
    display: 'block',
    color: '#2563eb',
    fontSize: '10px',
    fontWeight: 850,
    letterSpacing: '1.2px',
    marginBottom: '10px',
  },
  publicSectionEyebrowLight: {
    display: 'block',
    color: '#93c5fd',
    fontSize: '10px',
    fontWeight: 850,
    letterSpacing: '1.2px',
    marginBottom: '10px',
  },
  publicSectionTitle: {
    margin: 0,
    color: '#0f172a',
    fontSize: '38px',
    lineHeight: 1.12,
    letterSpacing: '-1.3px',
  },
  publicSectionText: {
    margin: '16px 0 0',
    color: '#64748b',
    fontSize: '14px',
    lineHeight: 1.7,
  },
  publicBenefitGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))',
    gap: '16px',
    marginTop: '42px',
  },
  publicBenefitCard: {
    padding: '28px',
    border: '1px solid #e2e8f0',
    borderRadius: '18px',
    background: '#ffffff',
    boxShadow: '0 10px 34px rgba(15,23,42,.045)',
  },
  publicBenefitIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#eff6ff',
    color: '#2563eb',
    fontSize: '18px',
    fontWeight: 800,
  },
  publicBenefitTitle: {
    margin: '18px 0 8px',
    color: '#0f172a',
    fontSize: '17px',
  },
  publicBenefitText: {
    margin: 0,
    color: '#64748b',
    fontSize: '12px',
    lineHeight: 1.7,
  },
  publicHowSection: {
    background: '#f8fafc',
    borderTop: '1px solid #eef2f7',
    borderBottom: '1px solid #eef2f7',
  },
  publicHowGrid: {
    maxWidth: '1180px',
    margin: '0 auto',
    padding: '92px 24px',
    display: 'grid',
    gridTemplateColumns: 'minmax(0,.9fr) minmax(0,1.1fr)',
    gap: '70px',
    alignItems: 'center',
  },
  publicSteps: {
    display: 'grid',
    gap: '12px',
  },
  publicStep: {
    display: 'grid',
    gridTemplateColumns: '48px 1fr',
    gap: '16px',
    alignItems: 'start',
    padding: '18px',
    borderRadius: '15px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
  },
  publicStepNumber: {
    width: '40px',
    height: '40px',
    borderRadius: '11px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#eff6ff',
    color: '#2563eb',
    fontSize: '10px',
    fontWeight: 850,
  },
  publicStepTitle: {
    margin: 0,
    color: '#0f172a',
    fontSize: '15px',
  },
  publicStepText: {
    margin: '6px 0 0',
    color: '#64748b',
    fontSize: '11px',
    lineHeight: 1.6,
  },
  publicMethodCard: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0,1fr) minmax(380px,.9fr)',
    gap: '46px',
    alignItems: 'center',
    padding: '42px',
    borderRadius: '24px',
    background:
      'linear-gradient(135deg,#0f172a 0%,#172554 60%,#1d4ed8 145%)',
    color: '#ffffff',
    boxShadow: '0 26px 60px rgba(15,23,42,.14)',
  },
  publicMethodTitle: {
    margin: 0,
    maxWidth: '620px',
    fontSize: '32px',
    lineHeight: 1.15,
    letterSpacing: '-1px',
  },
  publicMethodText: {
    margin: '15px 0 0',
    maxWidth: '620px',
    color: '#cbd5e1',
    fontSize: '12px',
    lineHeight: 1.7,
  },
  publicMethodGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2,1fr)',
    gap: '9px',
  },
  publicMethodItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    borderRadius: '11px',
    background: 'rgba(255,255,255,.08)',
    border: '1px solid rgba(255,255,255,.10)',
    fontSize: '10px',
  },
  publicContentSection: {
    maxWidth: '1180px',
    margin: '0 auto',
    padding: '40px 24px 78px',
  },
  publicVideoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))',
    gap: '16px',
    marginTop: '38px',
  },
  publicVideoCard: {
    display: 'block',
    overflow: 'hidden',
    borderRadius: '18px',
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    textDecoration: 'none',
    boxShadow: '0 10px 34px rgba(15,23,42,.045)',
  },
  publicVideoPreview: {
    position: 'relative',
    minHeight: '150px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      'radial-gradient(circle at 70% 20%, rgba(59,130,246,.30), transparent 28%), linear-gradient(135deg,#0f172a,#172554 60%,#1d4ed8 140%)',
  },
  publicVideoPlay: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: '3px',
    background: '#ffffff',
    color: '#2563eb',
    fontSize: '16px',
    boxShadow: '0 12px 28px rgba(15,23,42,.22)',
  },
  publicVideoBadge: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    padding: '6px 8px',
    borderRadius: '999px',
    background: 'rgba(255,255,255,.12)',
    border: '1px solid rgba(255,255,255,.14)',
    color: '#ffffff',
    fontSize: '8px',
    fontWeight: 800,
  },
  publicVideoBody: {
    padding: '20px',
  },
  publicVideoTitle: {
    margin: 0,
    color: '#0f172a',
    fontSize: '16px',
  },
  publicVideoText: {
    margin: '8px 0 0',
    color: '#64748b',
    fontSize: '11px',
    lineHeight: 1.65,
  },
  publicVideoLink: {
    display: 'inline-block',
    marginTop: '14px',
    color: '#2563eb',
    fontSize: '10px',
  },
  publicSocialRow: {
    marginTop: '20px',
    padding: '22px',
    borderRadius: '16px',
    border: '1px solid #dbeafe',
    background: '#f8fbff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
    flexWrap: 'wrap',
  },
  publicSocialTitle: {
    color: '#0f172a',
    fontSize: '14px',
  },
  publicSocialText: {
    margin: '6px 0 0',
    color: '#64748b',
    fontSize: '10px',
    lineHeight: 1.5,
  },
  publicSocialActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  publicSocialButton: {
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #dbe3ef',
    background: '#ffffff',
    color: '#334155',
    textDecoration: 'none',
    fontSize: '10px',
    fontWeight: 750,
  },
  publicSocialButtonPrimary: {
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #2563eb',
    background: '#2563eb',
    color: '#ffffff',
    textDecoration: 'none',
    fontSize: '10px',
    fontWeight: 750,
  },
  publicFooterSocial: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  publicFooterLink: {
    color: '#475569',
    fontSize: '10px',
    fontWeight: 700,
    textDecoration: 'none',
  },
  publicCtaSection: {
    maxWidth: '1180px',
    margin: '0 auto',
    padding: '18px 24px 96px',
  },
  publicCtaCard: {
    padding: '54px 28px',
    borderRadius: '24px',
    textAlign: 'center',
    background: '#f8fbff',
    border: '1px solid #dbeafe',
  },
  publicCtaTitle: {
    maxWidth: '760px',
    margin: '0 auto',
    color: '#0f172a',
    fontSize: '34px',
    lineHeight: 1.15,
    letterSpacing: '-1px',
  },
  publicCtaText: {
    maxWidth: '680px',
    margin: '15px auto 24px',
    color: '#64748b',
    fontSize: '13px',
    lineHeight: 1.7,
  },
  publicFooter: {
    borderTop: '1px solid #e2e8f0',
    background: '#ffffff',
  },
  publicFooterInner: {
    maxWidth: '1180px',
    margin: '0 auto',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '18px',
  },
  publicFooterText: {
    color: '#94a3b8',
    fontSize: '10px',
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
    padding: '38px 24px 64px',
    maxWidth: '880px',
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
    minHeight: 'calc(100vh - 72px)',
    padding: '28px 20px',
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
    padding: '38px 24px 64px',
    maxWidth: '1120px',
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