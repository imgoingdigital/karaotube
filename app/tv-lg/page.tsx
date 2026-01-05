'use client';

import { useEffect } from 'react';

export default function TVLGPage() {
  useEffect(() => {
    window.location.href = '/tv-lg/index.html';
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0F0F0F',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      Redirecting to LG TV interface...
    </div>
  );
}
