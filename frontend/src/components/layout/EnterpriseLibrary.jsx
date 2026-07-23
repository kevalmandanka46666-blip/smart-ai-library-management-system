import React, { memo } from 'react';

/**
 * Reusable PageHeader component for standard page headers.
 */
export const PageHeader = memo(({ title, subtitle, badgeText, actions }) => {
  return (
    <header 
      className="eu-page-header" 
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        width: '100%',
        flexWrap: 'wrap',
        gap: '1rem',
        textAlign: 'left'
      }}
    >
      <div className="eu-page-header-meta">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--eu-font-size-xl, 1.5rem)', color: 'var(--eu-color-text-main, #1e1b15)' }}>{title}</h2>
          {badgeText && (
            <span 
              className="eu-page-header-badge" 
              style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--eu-radius-md, 8px)',
                background: 'rgba(212, 160, 23, 0.1)',
                color: 'var(--eu-color-primary, #D4A017)',
                border: '1px solid rgba(212, 160, 23, 0.2)'
              }}
            >
              {badgeText}
            </span>
          )}
        </div>
        {subtitle && (
          <span 
            className="eu-page-header-subtitle" 
            style={{ 
              fontSize: 'var(--eu-font-size-sm, 0.82rem)', 
              color: 'var(--eu-color-text-soft, #9ca3af)', 
              fontWeight: '600',
              marginTop: '0.25rem',
              display: 'inline-block'
            }}
          >
            {subtitle}
          </span>
        )}
      </div>
      {actions && <div className="eu-page-header-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>{actions}</div>}
    </header>
  );
});

/**
 * Reusable AnalyticsCard component for KPI metric displays.
 */
export const AnalyticsCard = memo(({ title, value, subtitle, trend, trendUp, onClick, icon }) => {
  return (
    <div 
      className="eu-analytics-card"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '1.25rem',
        borderRadius: 'var(--eu-radius-lg, 12px)',
        background: 'var(--eu-color-bg-surface, #fdfcf9)',
        border: '1px solid var(--eu-color-border-main, rgba(226, 211, 179, 0.3))',
        boxShadow: 'var(--eu-shadow-low, 0 2px 6px rgba(0, 0, 0, 0.05))',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'var(--eu-transition-normal, all 0.25s cubic-bezier(0.16, 1, 0.3, 1))',
        flex: 1,
        minWidth: '220px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {icon && <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--eu-color-primary, #D4A017)' }}>{icon}</span>}
          <span style={{ fontSize: 'var(--eu-font-size-sm, 0.82rem)', color: 'var(--eu-color-text-soft, #9ca3af)', fontWeight: '600' }}>{title}</span>
        </div>
        {trendUp !== undefined && (
          <span 
            style={{
              fontSize: '0.72rem',
              fontWeight: '700',
              color: trendUp ? 'var(--eu-color-success, #16a34a)' : 'var(--eu-color-danger, #dc2626)',
              background: trendUp ? 'var(--eu-color-success-bg, rgba(22, 163, 74, 0.1))' : 'var(--eu-color-danger-bg, rgba(220, 38, 38, 0.1))',
              padding: '0.2rem 0.5rem',
              borderRadius: 'var(--eu-radius-sm, 4px)'
            }}
          >
            {trendUp ? '▲' : '▼'} {trend}
          </span>
        )}
      </div>
      <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', color: 'var(--eu-color-text-main, #1e1b15)' }}>{value}</h3>
      {subtitle && (
        <span style={{ fontSize: '0.78rem', color: 'var(--eu-color-text-soft, #9ca3af)', marginTop: '0.25rem' }}>
          {subtitle}
        </span>
      )}
    </div>
  );
});

/**
 * Reusable ChartCard component for analytics wrapping.
 */
export const ChartCard = memo(({ title, subtitle, headerActions, children }) => {
  return (
    <div 
      className="eu-chart-card" 
      style={{
        padding: '1.5rem',
        borderRadius: 'var(--eu-radius-lg, 12px)',
        background: 'var(--eu-color-bg-surface, #fdfcf9)',
        border: '1px solid var(--eu-color-border-main, rgba(226, 211, 179, 0.3))',
        boxShadow: 'var(--eu-shadow-low, 0 2px 6px rgba(0, 0, 0, 0.05))',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 'var(--eu-font-size-lg, 1.15rem)', fontWeight: '800', color: 'var(--eu-color-text-main, #1e1b15)' }}>{title}</h4>
          {subtitle && <span style={{ fontSize: 'var(--eu-font-size-xs, 0.72rem)', color: 'var(--eu-color-text-soft, #9ca3af)', fontWeight: '600' }}>{subtitle}</span>}
        </div>
        {headerActions && <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>{headerActions}</div>}
      </div>
      <div className="eu-chart-card-content" style={{ width: '100%' }}>
        {children}
      </div>
    </div>
  );
});

/**
 * Reusable EmptyState component for list/graph fallbacks.
 */
export const EmptyState = memo(({ message, description, icon }) => {
  return (
    <div 
      className="eu-empty-state"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1.5rem',
        textAlign: 'center',
        color: 'var(--eu-color-text-soft, #9ca3af)',
        width: '100%'
      }}
    >
      {icon && <span style={{ marginBottom: '0.75rem', color: 'var(--eu-color-primary, #D4A017)' }}>{icon}</span>}
      <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--eu-color-text-main, #1e1b15)' }}>{message}</h5>
      {description && <p style={{ fontSize: 'var(--eu-font-size-sm, 0.82rem)', marginTop: '0.25rem', maxWidth: '320px', lineHeight: 1.4 }}>{description}</p>}
    </div>
  );
});

/**
 * Reusable StatusBadge component for labels and states.
 */
export const StatusBadge = memo(({ label, variant = 'info' }) => {
  const variantStyles = {
    success: { bg: 'var(--eu-color-success-bg, rgba(22, 163, 74, 0.1))', color: 'var(--eu-color-success, #16a34a)' },
    info: { bg: 'var(--eu-color-info-bg, rgba(59, 130, 246, 0.1))', color: 'var(--eu-color-info, #3b82f6)' },
    warning: { bg: 'var(--eu-color-warning-bg, rgba(234, 88, 12, 0.1))', color: 'var(--eu-color-warning, #ea580c)' },
    danger: { bg: 'var(--eu-color-danger-bg, rgba(220, 38, 38, 0.1))', color: 'var(--eu-color-danger, #dc2626)' },
    gold: { bg: 'rgba(212, 160, 23, 0.1)', color: 'var(--eu-color-primary, #D4A017)' }
  };
  const style = variantStyles[variant] || variantStyles.info;

  return (
    <span 
      className="eu-status-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.25rem 0.6rem',
        borderRadius: 'var(--eu-radius-full, 9999px)',
        fontSize: 'var(--eu-font-size-xs, 0.72rem)',
        fontWeight: '700',
        textTransform: 'capitalize',
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.color}33`,
        whiteSpace: 'nowrap'
      }}
    >
      {label}
    </span>
  );
});

/**
 * Reusable LoadingSkeleton component for skeleton loaders.
 */
export const LoadingSkeleton = ({ variant = 'text', width = '100%', height = '20px', count = 1 }) => {
  const borderRadius = variant === 'circle' ? 'var(--eu-radius-full, 9999px)' : 'var(--eu-radius-sm, 4px)';
  const renderItem = (key) => (
    <div 
      key={key}
      className="eu-loading-skeleton"
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-loading 1.5s infinite ease-in-out',
        marginBottom: count > 1 ? '0.5rem' : '0'
      }}
    />
  );

  return (
    <div style={{ width: '100%' }}>
      {Array.from({ length: count }).map((_, idx) => renderItem(idx))}
      <style>{`
        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

/**
 * Reusable Enterprise DataTable component.
 * Supports custom columns mapping, header elements, styling, and action triggers.
 */
export const DataTable = ({ columns, data, onRowClick, emptyMessage = "No records found.", loading = false }) => {
  if (loading) {
    return <LoadingSkeleton count={5} height="40px" />;
  }

  return (
    <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
      <table className="dashboard-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th 
                key={idx} 
                style={{ 
                  textAlign: col.align || 'left', 
                  padding: '12px 16px',
                  backgroundColor: 'rgba(226, 211, 179, 0.1)',
                  color: 'var(--eu-color-text-main, #1e1b15)',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  borderBottom: '2px solid var(--eu-color-border-main, rgba(226, 211, 179, 0.3))'
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(!data || data.length === 0) ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: '0' }}>
                <EmptyState message={emptyMessage} />
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr 
                key={rowIdx} 
                onClick={onRowClick ? () => onRowClick(row, rowIdx) : undefined}
                style={{ 
                  cursor: onRowClick ? 'pointer' : 'default',
                  borderBottom: '1px solid var(--eu-color-border-main, rgba(226, 211, 179, 0.3))',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={e => { if (onRowClick) e.currentTarget.style.backgroundColor = 'rgba(212, 160, 23, 0.04)'; }}
                onMouseLeave={e => { if (onRowClick) e.currentTarget.style.backgroundColor = ''; }}
              >
                {columns.map((col, colIdx) => (
                  <td 
                    key={colIdx} 
                    style={{ 
                      padding: '12px 16px', 
                      textAlign: col.align || 'left',
                      fontSize: '0.85rem',
                      color: 'var(--eu-color-text-main, #1e1b15)'
                    }}
                  >
                    {col.cell ? col.cell(row, rowIdx) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

