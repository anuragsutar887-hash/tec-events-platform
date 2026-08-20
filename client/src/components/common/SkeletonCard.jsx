import React from 'react';

export function SkeletonEventCard() {
  return (
    <div className="card skeleton-card" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minHeight: '260px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="skeleton" style={{ width: '90px', height: '24px', borderRadius: 'var(--radius-full)' }} />
        <div className="skeleton" style={{ width: '60px', height: '20px', borderRadius: 'var(--radius-full)' }} />
      </div>

      <div className="skeleton" style={{ width: '70%', height: '28px', marginTop: 'var(--space-2)' }} />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <div className="skeleton" style={{ width: '100%', height: '14px' }} />
        <div className="skeleton" style={{ width: '85%', height: '14px' }} />
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'auto', paddingTop: 'var(--space-3)' }}>
        <div className="skeleton" style={{ width: '110px', height: '16px' }} />
        <div className="skeleton" style={{ width: '90px', height: '16px' }} />
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
        <div className="skeleton skeleton-btn" style={{ flex: 1, height: '40px' }} />
        <div className="skeleton skeleton-btn" style={{ flex: 1, height: '40px' }} />
      </div>
    </div>
  );
}

export function SkeletonAdminEventRow() {
  return (
    <div className="card" style={{ padding: 'var(--space-5) var(--space-6)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', flex: 1, minWidth: '240px' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <div className="skeleton" style={{ width: '200px', height: '24px' }} />
          <div className="skeleton" style={{ width: '80px', height: '22px', borderRadius: 'var(--radius-full)' }} />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <div className="skeleton" style={{ width: '120px', height: '14px' }} />
          <div className="skeleton" style={{ width: '100px', height: '14px' }} />
          <div className="skeleton" style={{ width: '90px', height: '14px' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <div className="skeleton skeleton-btn" style={{ width: '70px', height: '36px' }} />
        <div className="skeleton skeleton-btn" style={{ width: '80px', height: '36px' }} />
        <div className="skeleton skeleton-btn" style={{ width: '80px', height: '36px' }} />
        <div className="skeleton skeleton-btn" style={{ width: '36px', height: '36px' }} />
      </div>
    </div>
  );
}

export function SkeletonLeaderboardCard() {
  return (
    <div className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
      <div className="skeleton" style={{ width: '50px', height: '40px', borderRadius: 'var(--radius-md)' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <div className="skeleton" style={{ width: '180px', height: '22px' }} />
          <div className="skeleton" style={{ width: '100px', height: '18px', borderRadius: 'var(--radius-full)' }} />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <div className="skeleton" style={{ width: '160px', height: '16px' }} />
          <div className="skeleton" style={{ width: '160px', height: '16px' }} />
        </div>
      </div>
      <div className="skeleton" style={{ width: '90px', height: '26px', borderRadius: 'var(--radius-full)' }} />
    </div>
  );
}
