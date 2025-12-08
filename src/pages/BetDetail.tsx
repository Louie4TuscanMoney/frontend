import { createSignal, onMount, Show } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { betInputApi } from '../api/clients';
import '../styles/BetDetail.css';

export default function BetDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const [bet, setBet] = createSignal<any>(null);
  const [loading, setLoading] = createSignal(true);

  onMount(async () => {
    await loadBet();
  });

  async function loadBet() {
    try {
      setLoading(true);
      const portfolioData = await betInputApi.getPortfolio();
      const bets = portfolioData?.bet_history || [];
      const betId = parseInt(params.id);
      const foundBet = bets.find(b => b.id === betId);
      
      if (foundBet) {
        setBet(foundBet);
      } else {
        console.error('Bet not found:', betId);
      }
    } catch (error) {
      console.error('Error loading bet:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusClass(status: string) {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'won' || statusLower === 'win') return 'status-won';
    if (statusLower === 'lost' || statusLower === 'loss') return 'status-lost';
    if (statusLower === 'push') return 'status-push';
    return 'status-pending';
  }

  function getStatusDisplay(status: string) {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'won' || statusLower === 'win') return 'Won';
    if (statusLower === 'lost' || statusLower === 'loss') return 'Lost';
    if (statusLower === 'push') return 'Push';
    return 'Pending';
  }

  function formatDate(dateString: string) {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  }

  const betData = bet();

  return (
    <div class="bet-detail">
      <button class="back-button" onclick={() => navigate('/portfolio')}>
        ← Back to Portfolio
      </button>

      {loading() ? (
        <div class="loading">Loading bet details...</div>
      ) : (
        <Show when={betData} fallback={<div class="error">Bet not found</div>}>
          <div class="bet-detail-card">
            <div class="bet-header">
              <h1>Bet Details</h1>
              <div class={`status-badge ${getStatusClass(betData.status || betData.result)}`}>
                {getStatusDisplay(betData.status || betData.result)}
              </div>
            </div>

            <div class="bet-info-grid">
              <div class="info-section">
                <h2>Game Information</h2>
                <div class="info-item">
                  <span class="info-label">Date:</span>
                  <span class="info-value">{formatDate(betData.created_at || betData.date)}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Game:</span>
                  <span class="info-value">{betData.away_team} @ {betData.home_team}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Game ID:</span>
                  <span class="info-value">{betData.game_id || 'N/A'}</span>
                </div>
              </div>

              <div class="info-section">
                <h2>Bet Details</h2>
                <div class="info-item">
                  <span class="info-label">Team:</span>
                  <span class="info-value">{betData.team_selected}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Bet Type:</span>
                  <span class="info-value">{betData.bet_type || 'Point Spread'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Spread:</span>
                  <span class="info-value">
                    {betData.spread !== null && betData.spread !== undefined 
                      ? `${betData.spread > 0 ? '+' : ''}${betData.spread}`
                      : 'N/A'}
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">American Odds:</span>
                  <span class="info-value">
                    {betData.american_odds > 0 ? '+' : ''}{betData.american_odds || '-110'}
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">Decimal Odds:</span>
                  <span class="info-value">{betData.decimal_odds?.toFixed(2) || '1.91'}</span>
                </div>
              </div>

              <div class="info-section">
                <h2>Financial Details</h2>
                <div class="info-item">
                  <span class="info-label">Bet Amount:</span>
                  <span class="info-value">${betData.bet_amount?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Payout:</span>
                  <span class="info-value">
                    {(() => {
                      const status = (betData.status || betData.result || 'pending').toLowerCase();
                      if (status === 'pending') return 'Pending';
                      if (status === 'push') return 'Refund';
                      return `$${betData.payout?.toFixed(2) || '0.00'}`;
                    })()}
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">Profit:</span>
                  <span class={`info-value ${(betData.profit || 0) >= 0 ? 'profit' : 'loss'}`}>
                    ${betData.profit?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">ROI:</span>
                  <span class={`info-value ${(betData.roi || 0) >= 0 ? 'profit' : 'loss'}`}>
                    {betData.roi?.toFixed(2) || '0.00'}%
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">Risk %:</span>
                  <span class="info-value">{betData.risk_percent?.toFixed(2) || '7.33'}%</span>
                </div>
              </div>

              <div class="info-section">
                <h2>Analysis</h2>
                <div class="info-item">
                  <span class="info-label">Win Probability:</span>
                  <span class="info-value">
                    {betData.win_probability 
                      ? `${(betData.win_probability * 100).toFixed(2)}%`
                      : 'N/A'}
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">Balance Before:</span>
                  <span class="info-value">
                    ${betData.balance_before?.toFixed(2) || 'N/A'}
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">Balance After:</span>
                  <span class="info-value">
                    ${betData.balance_after?.toFixed(2) || 'N/A'}
                  </span>
                </div>
                {betData.final_score && (
                  <div class="info-item">
                    <span class="info-label">Final Score:</span>
                    <span class="info-value">{betData.final_score}</span>
                  </div>
                )}
                {betData.resolved_at && (
                  <div class="info-item">
                    <span class="info-label">Resolved At:</span>
                    <span class="info-value">{formatDate(betData.resolved_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Show>
      )}
    </div>
  );
}

