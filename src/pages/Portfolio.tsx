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
      const [portfolioData, historyData] = await Promise.all([
        betInputApi.getPortfolio(),
        betInputApi.getBets()
      ]);
      setPortfolio(portfolioData);
      
      // Combine bets from both sources (new bets and historical)
      const newBets = historyData.bets || [];
      const historicalBets = portfolioData?.bet_history || [];
      
      // Merge and deduplicate by ID
      const allBets = [...newBets];
      const existingIds = new Set(newBets.map(b => b.id));
      historicalBets.forEach(bet => {
        if (!existingIds.has(bet.id)) {
          allBets.push(bet);
        }
      });
      
      // Sort by date (newest first)
      allBets.sort((a, b) => {
        const dateA = new Date(a.created_at || a.date || 0).getTime();
        const dateB = new Date(b.created_at || b.date || 0).getTime();
        return dateB - dateA;
      });
      
      setBetHistory(allBets);
      
      // Auto-resolve pending bets
      try {
        await fetch(`${import.meta.env.VITE_BETINPUT_API_URL || 'http://localhost:8002'}/api/bets/resolve-all`, {
          method: 'POST'
        });
      } catch (e) {
        // Silent fail - resolution happens in background
      }
    } catch (error) {
      console.error('Error loading portfolio:', error);
    } finally {
      setLoading(false);
    }
  }

  function getFilteredBets() {
    const bets = betHistory();
    if (filter() === 'all') return bets;
    const status = bet.status || bet.result || 'pending';
    return bets.filter(bet => {
      const betStatus = (bet.status || bet.result || 'pending').toLowerCase();
      if (filter() === 'won') return betStatus === 'won' || betStatus === 'win';
      if (filter() === 'lost') return betStatus === 'lost' || betStatus === 'loss';
      if (filter() === 'pending') return betStatus === 'pending';
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
    } else {
      return 'status-pending';
    }
  }

  function getStatusDisplay(status: string) {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'won' || statusLower === 'win') return 'Won';
    if (statusLower === 'lost' || statusLower === 'loss') return 'Lost';
    return 'Pending';
  }

  const portfolioData = portfolio();
  const stats = portfolioData?.statistics || portfolioData || {};
  
  // Calculate stats from bet history if not provided
  const allBets = betHistory();
  const calculatedStats = {
    total_bets: stats.total_bets || allBets.length,
    wins: stats.wins || allBets.filter(b => (b.status || b.result || '').toLowerCase() === 'won' || (b.status || b.result || '').toLowerCase() === 'win').length,
    losses: stats.losses || allBets.filter(b => (b.status || b.result || '').toLowerCase() === 'lost' || (b.status || b.result || '').toLowerCase() === 'loss').length,
    pending: stats.pending || allBets.filter(b => (b.status || b.result || 'pending').toLowerCase() === 'pending').length,
    total_profit: stats.total_profit || allBets.reduce((sum, b) => sum + (b.profit || 0), 0),
    win_rate: stats.win_rate || (allBets.filter(b => (b.status || b.result || '').toLowerCase() === 'won' || (b.status || b.result || '').toLowerCase() === 'win').length / Math.max(allBets.filter(b => (b.status || b.result || 'pending').toLowerCase() !== 'pending').length, 1))
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
                ${(portfolioData?.balance || 150).toFixed(2)}
              </div>
            </div>
            
            <div class="summary-card risk">
              <div class="card-label">Risk % (Kelly)</div>
              <div class="card-value">
                {(portfolioData?.risk_percent || 7.33).toFixed(2)}%
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
                        {(bet.status || bet.result || 'pending').toLowerCase() === 'pending' 
                          ? 'Pending' 
                          : `$${bet.payout?.toFixed(2) || '0.00'}`}
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

