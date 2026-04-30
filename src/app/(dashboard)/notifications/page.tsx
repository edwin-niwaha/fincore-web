'use client';

import { NotificationsPage } from '@/features/notifications/notifications-page';
import { notificationsApi } from '@/lib/api/services';

export default function WorkspaceNotificationsPage() {
  return (
    <NotificationsPage
      title="Notifications"
      description="Track alerts tied to your current FinCore workspace account."
      service={notificationsApi}
    />
  );
}
