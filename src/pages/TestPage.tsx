import { createSignal, onMount } from 'solid-js';

export default function TestPage() {
  const [message, setMessage] = createSignal('Testing...');

  onMount(() => {
    setMessage('✅ Frontend is working! If you see this, the app loaded correctly.');
  });

  return (
    <div style="padding: 2rem; text-align: center;">
      <h1>Test Page</h1>
      <p>{message()}</p>
      <div style="margin-top: 2rem;">
        <h2>API Tests:</h2>
        <button onclick={async () => {
          try {
            const res = await fetch('http://localhost:8000/games');
            const data = await res.json();
            alert(`NBA API: OK - ${data.count || 0} games`);
          } catch (e) {
            alert(`NBA API: ERROR - ${e.message}`);
          }
        }}>Test NBA API</button>
        
        <button onclick={async () => {
          try {
            const res = await fetch('http://localhost:8002/api/health');
            const data = await res.json();
            alert(`BetInput API: OK - ${JSON.stringify(data)}`);
          } catch (e) {
            alert(`BetInput API: ERROR - ${e.message}`);
          }
        }}>Test BetInput API</button>
      </div>
    </div>
  );
}

