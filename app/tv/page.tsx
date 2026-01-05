'use client';

import { useEffect } from 'react';

export default function TVPage() {
  useEffect(() => {
    window.location.href = '/tv/index.html';
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
      Redirecting to TV interface...
    </div>
  );
}
