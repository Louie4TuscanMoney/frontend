import { createSignal, onMount, For, Show } from 'solid-js';
import { betInputApi } from '../api/clients';
import '../styles/Portfolio.css';

export default function Portfolio() {
  const [portfolio, setPortfolio] = createSignal<any>(null);
  const [betHistory, setBetHistory] = createSignal<any[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [filter, setFilter] = createSignal<string>('all'); // all, pending, won, lost

  onMount(async () => {
    await loadPortfolioData();
  });

  async function loadPortfolioData() {
    try {
      setLoading(true);
      
      // Get portfolio data (includes bet_history, statistics, balance)
      const portfolioData = await betInputApi.getPortfolio();
      setPortfolio(portfolioData);
      
      // Use bet_history from portfolio (already includes all bets from trade_log.json)
      const bets = portfolioData?.bet_history || [];
      setBetHistory(bets);
      
      console.log(`📊 Portfolio loaded: ${bets.length} bets, balance: $${portfolioData?.balance || 0}`);
      
      // Auto-resolve pending bets in background
      try {
        const betInputUrl = import.meta.env.VITE_BETINPUT_API_URL || 
          (import.meta.env.DEV ? 'http://localhost:8002' : 'https://betinput-production.up.railway.app');
        await fetch(`${betInputUrl}/api/bets/resolve-all`, {
          method: 'POST',
          mode: 'cors'
        });
      } catch (e) {
        // Silent fail - resolution happens in background
        console.warn('Could not auto-resolve bets:', e);
      }
    } catch (error) {
      console.error('❌ Error loading portfolio:', error);
    } finally {
      setLoading(false);
    }
  }

  function getFilteredBets() {
    const bets = betHistory();
    if (filter() === 'all') return bets;
    return bets.filter(bet => {
      const betStatus = (bet.status || bet.result || 'pending').toLowerCase();
      if (filter() === 'won') return betStatus === 'won' || betStatus === 'win';
      if (filter() === 'lost') return betStatus === 'lost' || betStatus === 'loss';
      if (filter() === 'pending') return betStatus === 'pending';
      if (filter() === 'push') return betStatus === 'push';
      return true;
    });
  }

  function formatDate(dateString: string) {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  function getStatusClass(status: string) {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'won' || statusLower === 'win') {
      return 'status-won';
    } else if (statusLower === 'lost' || statusLower === 'loss') {
      return 'status-lost';
    } else if (statusLower === 'push') {
      return 'status-push';
    } else {
      return 'status-pending';
    }
  }

  function getStatusDisplay(status: string) {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'won' || statusLower === 'win') return 'Won';
    if (statusLower === 'lost' || statusLower === 'loss') return 'Lost';
    if (statusLower === 'push') return 'Push';
    return 'Pending';
  }

  const portfolioData = portfolio();
  
  // Extract statistics with fallbacks
  const stats = portfolioData?.statistics || {};
  
  // Ensure PNL and Sharpe data exists
  const pnl = stats.pnl || portfolioData?.pnl || { 
    day: { total_profit: 0, bets: 0, total_risk: 0 }, 
    week: { total_profit: 0, bets: 0, total_risk: 0 }, 
    overall: { total_profit: 0, bets: 0, total_risk: 0 } 
  };
  
  const sharpe_ratio = stats.sharpe_ratio || portfolioData?.sharpe_ratio || { day: 0, week: 0, overall: 0 };
  
  // Calculate stats from bet history
  const allBets = betHistory();
  const calculatedStats = {
    total_bets: stats.total_bets ?? allBets.length,
    wins: stats.wins ?? allBets.filter(b => {
      const status = (b.status || b.result || '').toLowerCase();
      return status === 'won' || status === 'win';
    }).length,
    losses: stats.losses ?? allBets.filter(b => {
      const status = (b.status || b.result || '').toLowerCase();
      return status === 'lost' || status === 'loss';
    }).length,
    pending: stats.pending ?? allBets.filter(b => {
      const status = (b.status || b.result || 'pending').toLowerCase();
      return status === 'pending';
    }).length,
    total_profit: stats.total_profit ?? allBets.reduce((sum, b) => sum + (b.profit || 0), 0),
    win_rate: stats.win_rate ?? (() => {
      const resolved = allBets.filter(b => {
        const status = (b.status || b.result || 'pending').toLowerCase();
        return status !== 'pending';
      });
      const won = resolved.filter(b => {
        const status = (b.status || b.result || '').toLowerCase();
        return status === 'won' || status === 'win';
      });
      return resolved.length > 0 ? won.length / resolved.length : 0;
    })()
  };

  return (
    <div class="portfolio">
      <div class="portfolio-header">
        <h1>Portfolio</h1>
        <button onclick={loadPortfolioData} class="refresh-button">
          🔄 Refresh
        </button>
      </div>

      {loading() ? (
        <div class="loading">Loading portfolio...</div>
      ) : (
        <>
          {/* Portfolio Summary */}
          <div class="portfolio-summary">
            <div class="summary-card balance">
              <div class="card-label">Current Balance</div>
              <div class="card-value">
                ${(portfolioData?.balance ?? 150).toFixed(2)}
              </div>
            </div>
            
            <div class="summary-card risk">
              <div class="card-label">Risk % (Kelly)</div>
              <div class="card-value">
                {(portfolioData?.risk_percent ?? 7.33).toFixed(2)}%
              </div>
            </div>

            <div class="summary-card total-bets">
              <div class="card-label">Total Bets</div>
              <div class="card-value">
                {calculatedStats.total_bets}
              </div>
            </div>

            <div class="summary-card win-rate">
              <div class="card-label">Win Rate</div>
              <div class="card-value">
                {(calculatedStats.win_rate * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* PNL by Period */}
          <div class="pnl-section">
            <h2>PNL (Profit & Loss)</h2>
            <div class="pnl-grid">
              <div class="pnl-card">
                <div class="pnl-label">Today</div>
                <div class={`pnl-value ${(pnl?.day?.total_profit ?? 0) >= 0 ? 'profit' : 'loss'}`}>
                  ${(pnl?.day?.total_profit ?? 0).toFixed(2)}
                </div>
                <div class="pnl-details">
                  {pnl?.day?.bets ?? 0} bets • ${(pnl?.day?.total_risk ?? 0).toFixed(2)} risk
                </div>
              </div>
              <div class="pnl-card">
                <div class="pnl-label">This Week</div>
                <div class={`pnl-value ${(pnl?.week?.total_profit ?? 0) >= 0 ? 'profit' : 'loss'}`}>
                  ${(pnl?.week?.total_profit ?? 0).toFixed(2)}
                </div>
                <div class="pnl-details">
                  {pnl?.week?.bets ?? 0} bets • ${(pnl?.week?.total_risk ?? 0).toFixed(2)} risk
                </div>
              </div>
              <div class="pnl-card">
                <div class="pnl-label">Overall</div>
                <div class={`pnl-value ${(pnl?.overall?.total_profit ?? 0) >= 0 ? 'profit' : 'loss'}`}>
                  ${(pnl?.overall?.total_profit ?? 0).toFixed(2)}
                </div>
                <div class="pnl-details">
                  {pnl?.overall?.bets ?? 0} bets • ${(pnl?.overall?.total_risk ?? 0).toFixed(2)} risk
                </div>
              </div>
            </div>
          </div>

          {/* Sharpe Ratio */}
          <div class="sharpe-section">
            <h2>Sharpe Ratio</h2>
            <div class="sharpe-grid">
              <div class="sharpe-card">
                <div class="sharpe-label">Today</div>
                <div class="sharpe-value">
                  {(sharpe_ratio?.day ?? 0).toFixed(4)}
                </div>
              </div>
              <div class="sharpe-card">
                <div class="sharpe-label">This Week</div>
                <div class="sharpe-value">
                  {(sharpe_ratio?.week ?? 0).toFixed(4)}
                </div>
              </div>
              <div class="sharpe-card">
                <div class="sharpe-label">Overall</div>
                <div class="sharpe-value">
                  {(sharpe_ratio?.overall ?? 0).toFixed(4)}
                </div>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div class="portfolio-stats">
            <div class="stat-item">
              <span class="stat-label">Wins:</span>
              <span class="stat-value wins">{calculatedStats.wins}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Losses:</span>
              <span class="stat-value losses">{calculatedStats.losses}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Pending:</span>
              <span class="stat-value pending">{calculatedStats.pending}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Total Profit:</span>
              <span class={`stat-value ${calculatedStats.total_profit >= 0 ? 'profit' : 'loss'}`}>
                ${calculatedStats.total_profit.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Bet History */}
          <div class="bet-history-section">
            <div class="history-header">
              <h2>Bet History</h2>
              <div class="filter-buttons">
                <button 
                  class={filter() === 'all' ? 'active' : ''}
                  onclick={() => setFilter('all')}
                >
                  All
                </button>
                <button 
                  class={filter() === 'pending' ? 'active' : ''}
                  onclick={() => setFilter('pending')}
                >
                  Pending
                </button>
                <button 
                  class={filter() === 'won' ? 'active' : ''}
                  onclick={() => setFilter('won')}
                >
                  Won
                </button>
                <button 
                  class={filter() === 'lost' ? 'active' : ''}
                  onclick={() => setFilter('lost')}
                >
                  Lost
                </button>
              </div>
            </div>

            <Show 
              when={getFilteredBets().length > 0}
              fallback={<div class="no-bets">No bets found</div>}
            >
              <div class="bets-table">
                <div class="table-header">
                  <div class="col-date">Date</div>
                  <div class="col-game">Game</div>
                  <div class="col-team">Team</div>
                  <div class="col-type">Type</div>
                  <div class="col-odds">Odds</div>
                  <div class="col-amount">Amount</div>
                  <div class="col-payout">Payout</div>
                  <div class="col-status">Status</div>
                </div>
                <For each={getFilteredBets()}>
                  {(bet) => (
                    <div class="table-row">
                      <div class="col-date">{formatDate(bet.created_at || bet.date)}</div>
                      <div class="col-game">
                        {bet.away_team} @ {bet.home_team}
                      </div>
                      <div class="col-team">
                        {bet.team_selected}
                        {bet.spread !== null && bet.spread !== undefined && (
                          <span style="color: #94a3b8; margin-left: 0.5rem;">
                            {bet.spread > 0 ? '+' : ''}{bet.spread}
                          </span>
                        )}
                      </div>
                      <div class="col-type">{bet.bet_type || 'Point Spread'}</div>
                      <div class="col-odds">{bet.american_odds > 0 ? '+' : ''}{bet.american_odds || '-110'}</div>
                      <div class="col-amount">${bet.bet_amount?.toFixed(2) || '0.00'}</div>
                      <div class="col-payout">
                        {(() => {
                          const status = (bet.status || bet.result || 'pending').toLowerCase();
                          if (status === 'pending') return 'Pending';
                          if (status === 'push') return 'Refund';
                          return `$${bet.payout?.toFixed(2) || '0.00'}`;
                        })()}
                      </div>
                      <div class={`col-status ${getStatusClass(bet.status || bet.result)}`}>
                        {getStatusDisplay(bet.status || bet.result)}
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </>
      )}
    </div>
  );
}

