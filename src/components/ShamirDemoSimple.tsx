/**
 * Simplified Shamir's Secret Sharing Demo Component
 * Testing basic functionality without complex styling
 */

import { useState } from 'react';
import {
  splitPassword,
  reconstructPassword,
  type PasswordShares
} from '../utils/secretSharing';

export default function ShamirDemoSimple() {
  const [password, setPassword] = useState('');
  const [shares, setShares] = useState<PasswordShares | null>(null);
  const [error, setError] = useState('');

  const handleSplit = () => {
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      const newShares = splitPassword(password);
      setShares(newShares);
    } catch (err) {
      setError('Failed to split password: ' + (err as Error).message);
    }
  };

  return (
    <div style={{ padding: '40px', backgroundColor: '#0a1628', minHeight: '100vh', color: 'white' }}>
      <h1>Shamir's Secret Sharing Demo (Simplified)</h1>

      {error && (
        <div style={{ backgroundColor: '#ef4444', padding: '10px', marginBottom: '20px', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px' }}>
          Enter Password (min 8 characters):
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '10px',
            fontSize: '16px',
            backgroundColor: '#1a2942',
            border: '1px solid #8b9dc3',
            borderRadius: '4px',
            color: 'white'
          }}
        />
      </div>

      <button
        onClick={handleSplit}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: '#8b9dc3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Split Password into 3 Shares
      </button>

      {shares && (
        <div style={{ marginTop: '40px' }}>
          <h2>Generated Shares (any 2 can reconstruct password):</h2>

          <div style={{ marginTop: '20px' }}>
            <h3>Share 1 (User Device):</h3>
            <code style={{
              display: 'block',
              padding: '10px',
              backgroundColor: '#1a2942',
              borderRadius: '4px',
              wordBreak: 'break-all',
              fontSize: '12px'
            }}>
              {shares.shareOne}
            </code>
          </div>

          <div style={{ marginTop: '20px' }}>
            <h3>Share 2 (Beneficiary):</h3>
            <code style={{
              display: 'block',
              padding: '10px',
              backgroundColor: '#1a2942',
              borderRadius: '4px',
              wordBreak: 'break-all',
              fontSize: '12px'
            }}>
              {shares.shareTwo}
            </code>
          </div>

          <div style={{ marginTop: '20px' }}>
            <h3>Share 3 (File Metadata):</h3>
            <code style={{
              display: 'block',
              padding: '10px',
              backgroundColor: '#1a2942',
              borderRadius: '4px',
              wordBreak: 'break-all',
              fontSize: '12px'
            }}>
              {shares.shareThree}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
