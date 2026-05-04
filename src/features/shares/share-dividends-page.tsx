'use client';

import { SharesFeatureGate, SharesPlaceholderPage } from '@/features/shares/shared';

export function ShareDividendsPage() {
  return (
    <SharesFeatureGate
      unavailableTitle="Dividends are not available"
      unavailableDescription="Only staff roles can access the dividends workspace."
    >
      <SharesPlaceholderPage
        title="Dividends"
        description="Declare dividends, review approvals, and track historical dividend allocations."
        summary="The share transaction model already has a dividend type, but dividend declaration, approval, allocation, and history pages still need dedicated backend endpoints."
        backlog={[
          'Declare dividends',
          'Approve dividends',
          'Dividend allocation engine',
          'Dividend history and reporting',
        ]}
      />
    </SharesFeatureGate>
  );
}
