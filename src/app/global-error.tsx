'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[AI Store Fatal Error]', error)
  }, [error])

  return (
    <div style={{
      minHeight: '100vh', background: '#09090b', color: '#f4f4f5',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif', padding: '2rem',
    }}>
      <div style={{ maxWidth: 400, textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, margin: '0 auto 1rem', borderRadius: 12,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem',
        }}>
          ⚡
        </div>
        <h1 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem' }}>Erro Interno do Servidor</h1>
        <p style={{ fontSize: '0.875rem', color: '#a1a1aa', marginBottom: '1.5rem' }}>
          Ocorreu um erro inesperado. Tente novamente em instantes.
        </p>
        {error.digest && (
          <p style={{ fontSize: '0.7rem', color: '#52525b', fontFamily: 'monospace' }}>
            Error ID: {error.digest}
          </p>
        )}
        <div style={{ marginTop: '1rem' }}>
          <button
            onClick={reset}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: 8,
              background: '#059669', color: 'white', border: 'none',
              cursor: 'pointer', fontSize: '0.875rem', marginRight: '0.5rem',
            }}
          >
            Tentar Novamente
          </button>
          <a
            href="/"
            style={{
              padding: '0.5rem 1.25rem', borderRadius: 8,
              border: '1px solid #3f3f46', color: '#d4d4d8',
              textDecoration: 'none', fontSize: '0.875rem', display: 'inline-block',
            }}
          >
            Ir ao Início
          </a>
        </div>
      </div>
    </div>
  )
}