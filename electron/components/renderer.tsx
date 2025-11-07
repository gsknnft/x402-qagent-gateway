'use client'
import React from 'react';
import { createRoot } from 'react-dom/client';

const App = () => {
  return (
    <div
      style={{
        background: '#0d0d0d',
        color: '#fff',
        fontFamily: 'monospace',
        padding: '2rem',
      }}
    >
      <h1>You are Home 🧠</h1>
      <p>Console connected. No bridge. No backend. Just presence.</p>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
