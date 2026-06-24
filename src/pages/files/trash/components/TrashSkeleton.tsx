export function TrashSkeleton() {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <tr
              key={i}
              style={{ borderBottom: '1px solid var(--border)' }}
              className="animate-pulse"
            >
              {/* Name */}
              <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-raised)',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        height: 12,
                        width: '55%',
                        borderRadius: 4,
                        background: 'var(--bg-raised)',
                        marginBottom: 6,
                      }}
                    />
                    <div
                      style={{
                        height: 9,
                        width: '30%',
                        borderRadius: 4,
                        background: 'var(--bg-raised)',
                      }}
                    />
                  </div>
                </div>
              </td>
              {/* Size */}
              <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                <div
                  style={{
                    height: 11,
                    width: 48,
                    borderRadius: 4,
                    background: 'var(--bg-raised)',
                  }}
                />
              </td>
              {/* Deleted at */}
              <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                <div
                  style={{
                    height: 11,
                    width: 72,
                    borderRadius: 4,
                    background: 'var(--bg-raised)',
                  }}
                />
              </td>
              {/* Scope */}
              <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                <div
                  style={{
                    height: 18,
                    width: 56,
                    borderRadius: 4,
                    background: 'var(--bg-raised)',
                  }}
                />
              </td>
              {/* Actions */}
              <td style={{ padding: '10px 16px 10px 12px', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <div
                    style={{
                      height: 28,
                      width: 88,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-raised)',
                    }}
                  />
                  <div
                    style={{
                      height: 28,
                      width: 112,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-raised)',
                    }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
