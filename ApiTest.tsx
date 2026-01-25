import React, { useState } from 'react';
import apiService from './api';

const ApiTest: React.FC = () => {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testHealthCheck = async () => {
    setLoading(true);
    setResult('Testing health check...');
    try {
      const response = await apiService.healthCheck();
      setResult(`✅ Health Check Success: ${JSON.stringify(response, null, 2)}`);
    } catch (error) {
      setResult(`❌ Health Check Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setLoading(false);
  };

  const testAnalytics = async () => {
    setLoading(true);
    setResult('Testing analytics...');
    try {
      const response = await apiService.getDashboardAnalytics();
      setResult(`✅ Analytics Success: ${JSON.stringify(response, null, 2)}`);
    } catch (error) {
      setResult(`❌ Analytics Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setLoading(false);
  };

  const testDirectFetch = async () => {
    setLoading(true);
    setResult('Testing direct fetch...');
    try {
      const response = await fetch('http://localhost:8000/api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setResult(`✅ Direct Fetch Success: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      setResult(`❌ Direct Fetch Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', background: 'white', margin: '20px', borderRadius: '10px' }}>
      <h2>API Connection Test</h2>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={testHealthCheck} disabled={loading} style={{ padding: '10px 20px' }}>
          Test Health Check
        </button>
        <button onClick={testAnalytics} disabled={loading} style={{ padding: '10px 20px' }}>
          Test Analytics
        </button>
        <button onClick={testDirectFetch} disabled={loading} style={{ padding: '10px 20px' }}>
          Test Direct Fetch
        </button>
      </div>
      <div style={{ 
        background: '#f5f5f5', 
        padding: '15px', 
        borderRadius: '5px', 
        minHeight: '200px',
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        fontSize: '12px'
      }}>
        {loading ? 'Loading...' : result || 'Click a button to test API connection'}
      </div>
    </div>
  );
};

export default ApiTest;