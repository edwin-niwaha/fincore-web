'use client';

import { SharesFeatureGate, SharesPlaceholderPage } from '@/features/shares/shared';

export function ShareTransfersPage() {
  return (
    <SharesFeatureGate
      unavailableTitle="Share transfers are not available"
      unavailableDescription="Only staff roles can access the share transfer workspace."
    >
      <SharesPlaceholderPage
        title="Share transfers"
        description="Initiate share transfers and review transfer history between member share accounts."
        summary="The backend model already recognizes transfer transaction types, but the transfer initiation service, approval flow, and transfer history UI are not yet connected."
        backlog={[
          'Initiate transfer form',
          'Transfer history ledger',
          'Approval routing',
          'Transfer validation and audit trail',
        ]}
      />
    </SharesFeatureGate>
  );
}
