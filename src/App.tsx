import { Router, Route, A } from '@solidjs/router';
import Home from './pages/Home';
import GameDetail from './pages/GameDetail';
import BetInput from './pages/BetInput';
import Portfolio from './pages/Portfolio';
import BetDetail from './pages/BetDetail';
import MCSResults from './pages/MCSResults';
import TestPage from './pages/TestPage';
import './App.css';

export default function App() {
  return (
    <Router root={(props) => (
      <div class="app">
        <nav class="navbar">
          <div class="nav-container">
            <A href="/" class="nav-logo">
              🏀 Tuscan Money NBA System
            </A>
            <div class="nav-links">
              <A href="/" class="nav-link" activeClass="active">Games</A>
              <A href="/mcs" class="nav-link" activeClass="active">MCS Predictions</A>
              <A href="/bet" class="nav-link" activeClass="active">Place Bet</A>
              <A href="/portfolio" class="nav-link" activeClass="active">Portfolio</A>
            </div>
          </div>
        </nav>
        
        <main class="main-content">
          {props.children}
        </main>
      </div>
    )}>
      <Route path="/" component={Home} />
      <Route path="/test" component={TestPage} />
      <Route path="/mcs" component={MCSResults} />
      <Route path="/game/:gameId" component={GameDetail} />
      <Route path="/bet" component={BetInput} />
      <Route path="/bet/:gameId" component={BetInput} />
      <Route path="/bet/detail/:id" component={BetDetail} />
      <Route path="/portfolio" component={Portfolio} />
    </Router>
  );
}

