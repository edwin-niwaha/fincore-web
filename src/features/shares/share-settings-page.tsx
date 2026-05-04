'use client';

import { SharesFeatureGate, SharesPlaceholderPage, shareSettingsRoles } from '@/features/shares/shared';

export function ShareSettingsPage() {
  return (
    <SharesFeatureGate
      roles={shareSettingsRoles}
      unavailableTitle="Share settings are not available"
      unavailableDescription="Only administration roles can access the shares settings workspace."
    >
      <SharesPlaceholderPage
        title="Share settings"
        description="Configure default share rules, approval thresholds, dividend rules, and accounting mappings."
        summary="Most shares settings still live implicitly in product setup or backend configuration. This page is now reserved in navigation so the settings workspace can be completed without changing the menu structure later."
        backlog={[
          'Minimum share defaults',
          'Share price defaults',
          'Dividend rules',
          'Approval thresholds',
          'GL mappings',
        ]}
      />
    </SharesFeatureGate>
  );
}
