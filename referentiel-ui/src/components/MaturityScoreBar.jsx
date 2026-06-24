import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';

/**
 * MaturityScoreBar — displays the project maturity/completeness score.
 * Props:
 *   score: number (0-100)
 *   size: 'sm' | 'md' | 'lg' (default 'md')
 *   showLabel: boolean
 *   showDetails: boolean
 *   details: object { [criterion]: boolean }
 */
const CRITERIA_LABELS = {
  hasNomCode: 'Nom & Code projet',
  hasDescription: 'Description',
  hasType: 'Type de projet',
  hasDirection: 'Direction métier',
  hasDates: 'Dates planifiées',
  hasBudget: 'Budget initial',
  hasChefDeProjet: 'Chef de projet assigné',
  hasSousPhases: 'Phases & Livrables',
  hasDocuments: 'Documents joints',
  hasRisques: 'Risques identifiés',
  hasCopil: 'COPIL enregistré',
};

const getScoreColor = (score) => {
  if (score >= 80) return { bar: '#6B9B2D', text: '#6B9B2D', bg: '#f2f6e8', label: 'Excellent' };
  if (score >= 60) return { bar: '#22c55e', text: '#16a34a', bg: '#f0fdf4', label: 'Bon' };
  if (score >= 40) return { bar: '#f97316', text: '#ea580c', bg: '#fff7ed', label: 'Partiel' };
  return { bar: '#ef4444', text: '#dc2626', bg: '#fef2f2', label: 'Incomplet' };
};

const MaturityScoreBar = ({ score = 0, size = 'md', showLabel = true, showDetails = false, details = null }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const colors = getScoreColor(score);

  useEffect(() => {
    // Animate from 0 to score
    let start = 0;
    const step = score / 30;
    const timer = setInterval(() => {
      start += step;
      if (start >= score) { setAnimatedScore(score); clearInterval(timer); }
      else setAnimatedScore(Math.round(start));
    }, 20);
    return () => clearInterval(timer);
  }, [score]);

  if (size === 'sm') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 maturity-bar-container" style={{ height: 4 }}>
          <div
            className="maturity-bar-fill"
            style={{ width: `${animatedScore}%`, background: colors.bar, height: 4 }}
          />
        </div>
        {showLabel && (
          <span className="text-xs font-bold flex-shrink-0" style={{ color: colors.text, minWidth: 30 }}>
            {animatedScore}%
          </span>
        )}
      </div>
    );
  }

  if (size === 'lg') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: colors.text }} />
            <span className="font-bold text-slate-700">Score de complétude</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold" style={{ color: colors.text }}>
              {animatedScore}%
            </span>
            <span
              className="maturity-badge text-xs"
              style={{ background: colors.bg, color: colors.text }}
            >
              {colors.label}
            </span>
          </div>
        </div>

        <div className="maturity-bar-container" style={{ height: 10 }}>
          <div
            className="maturity-bar-fill"
            style={{ width: `${animatedScore}%`, background: `linear-gradient(90deg, ${colors.bar}cc, ${colors.bar})` }}
          />
        </div>

        {showDetails && details && (
          <div className="grid grid-cols-2 gap-1.5 pt-2">
            {Object.entries(details).map(([key, done]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs">
                {done ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                )}
                <span className={done ? 'text-slate-600' : 'text-slate-400'}>
                  {CRITERIA_LABELS[key] || key}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default 'md'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 font-medium">Complétude</span>
        <span className="text-xs font-bold" style={{ color: colors.text }}>{animatedScore}%</span>
      </div>
      <div className="maturity-bar-container">
        <div
          className="maturity-bar-fill"
          style={{ width: `${animatedScore}%`, background: colors.bar }}
        />
      </div>
    </div>
  );
};

export default MaturityScoreBar;
