'use client';

export default function TVPage() {
  return (
    <iframe 
      src="/tv-lg/index.html" 
      style={{
        width: '100vw',
        height: '100vh',
        border: 'none',
        position: 'fixed',
        top: 0,
        left: 0
      }}
      title="Karaoke TV Interface (LG Replica)"
    />
  );
}
