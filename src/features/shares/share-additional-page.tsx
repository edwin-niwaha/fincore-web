'use client';

import { SharesFeatureGate, SharesPlaceholderPage } from '@/features/shares/shared';

export function ShareAdditionalPage() {
  return (
    <SharesFeatureGate
      unavailableTitle="Additional shares workflow is not available"
      unavailableDescription="Only staff roles can access the additional shares workspace."
    >
      <SharesPlaceholderPage
        title="Additional shares"
        description="Handle requests and approvals for additional share purchases beyond the standard purchase posting flow."
        summary="The dedicated request and approval workflow for additional shares has not been implemented yet. Staff can still use the live purchase page to post approved share purchases directly."
        backlog={[
          'Additional share request form',
          'Approval queue',
          'Request history',
          'Request-specific notifications',
        ]}
      />
    </SharesFeatureGate>
  );
}
