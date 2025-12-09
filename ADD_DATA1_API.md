# Adding data1 API to Frontend

## Overview

Add data1 API to your frontend to access @DailyMCS, @DailyOdds, and @DailyResults data.

## Step 1: Add Environment Variable

In your frontend `.env` or Railway/Vercel environment variables:

```bash
VITE_DATA_API_URL=https://data1-production.up.railway.app
```

## Step 2: Create data1 API Client

Create `frontend/src/api/data1Client.ts`:

```typescript
const DATA_API_URL = import.meta.env.VITE_DATA_API_URL || 'https://data1-production.up.railway.app';

export interface DailyMCSFile {
  name: string;
  path: string;
  data: any; // Full prediction data
}

export interface DailyData {
  folder: string;
  date: string;
  files: DailyMCSFile[];
  count: number;
}

export const data1Api = {
  /**
   * Get all MCS predictions for a date
   */
  async getDailyMCS(date: string): Promise<DailyData> {
    const response = await fetch(`${DATA_API_URL}/api/daily/DailyMCS/${date}`, {
      mode: 'cors',
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) throw new Error(`Failed to fetch DailyMCS: ${response.statusText}`);
    return response.json();
  },

  /**
   * Get all odds for a date
   */
  async getDailyOdds(date: string): Promise<DailyData> {
    const response = await fetch(`${DATA_API_URL}/api/daily/DailyOdds/${date}`, {
      mode: 'cors',
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) throw new Error(`Failed to fetch DailyOdds: ${response.statusText}`);
    return response.json();
  },

  /**
   * Get all results for a date
   */
  async getDailyResults(date: string): Promise<DailyData> {
    const response = await fetch(`${DATA_API_URL}/api/daily/DailyResults/${date}`, {
      mode: 'cors',
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) throw new Error(`Failed to fetch DailyResults: ${response.statusText}`);
    return response.json();
  },

  /**
   * Get specific game prediction file
   */
  async getGamePrediction(date: string, filename: string): Promise<any> {
    const response = await fetch(`${DATA_API_URL}/api/daily/DailyMCS/${date}/${filename}`, {
      mode: 'cors',
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) throw new Error(`Failed to fetch prediction: ${response.statusText}`);
    const data = await response.json();
    return data.data; // Return the actual prediction data
  }
};
```

## Step 3: Use in Your Components

### Example: Display Today's Predictions

```typescript
import { createSignal, onMount } from 'solid-js';
import { data1Api } from '../api/data1Client';

export default function Predictions() {
  const [predictions, setPredictions] = createSignal([]);
  const [loading, setLoading] = createSignal(true);

  onMount(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await data1Api.getDailyMCS(today);
      setPredictions(data.files);
    } catch (error) {
      console.error('Error loading predictions:', error);
    } finally {
      setLoading(false);
    }
  });

  return (
    <div>
      {loading() ? (
        <p>Loading predictions...</p>
      ) : (
        <div>
          <h2>Today's Predictions ({predictions().length})</h2>
          {predictions().map(file => (
            <div key={file.name}>
              <h3>{file.name}</h3>
              <pre>{JSON.stringify(file.data, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Step 4: Add Manual Run Button

Add a button to trigger Master.py:

```typescript
import { createSignal } from 'solid-js';

const MCS_API_URL = import.meta.env.VITE_MCS_API_URL || 'https://mcs1-production.up.railway.app';

export function MasterPyControls() {
  const [running, setRunning] = createSignal(false);
  const [status, setStatus] = createSignal('');

  async function triggerMasterPy() {
    try {
      setRunning(true);
      setStatus('Starting Master.py...');
      
      const response = await fetch(`${MCS_API_URL}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors'
      });
      
      const data = await response.json();
      setStatus(data.message || 'Master.py started successfully');
    } catch (error) {
      setStatus('Error: ' + error.message);
    } finally {
      setRunning(false);
    }
  }

  async function checkStatus() {
    try {
      const response = await fetch(`${MCS_API_URL}/api/run/status`, {
        mode: 'cors'
      });
      const data = await response.json();
      return data.running;
    } catch (error) {
      return false;
    }
  }

  return (
    <div>
      <button 
        onClick={triggerMasterPy} 
        disabled={running()}
      >
        {running() ? 'Running...' : 'Run Master.py'}
      </button>
      <p>{status()}</p>
    </div>
  );
}
```

## Complete Integration

Everything is ready:
- ✅ data1 API accessible from frontend
- ✅ @DailyMCS, @DailyOdds, @DailyResults endpoints available
- ✅ Manual Master.py trigger endpoint available
- ✅ CORS enabled on both APIs

Just add the API client and use it in your components!

