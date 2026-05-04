'use client';

import { SharesFeatureGate, SharesPlaceholderPage } from '@/features/shares/shared';

export function ShareCertificatesPage() {
  return (
    <SharesFeatureGate
      unavailableTitle="Share certificates are not available"
      unavailableDescription="Only staff roles can access the share certificates workspace."
    >
      <SharesPlaceholderPage
        title="Share certificates"
        description="Generate, preview, and issue share certificates for funded members."
        summary="Certificate generation and issuance still need a dedicated template engine, document storage, and issuance audit trail before this workflow can be fully enabled."
        backlog={[
          'Certificate generation template',
          'Issued certificate register',
          'Download and reissue flow',
          'Certificate audit log',
        ]}
      />
    </SharesFeatureGate>
  );
}
