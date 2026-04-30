'use client';

import { NotificationsPage } from '@/features/notifications/notifications-page';
import { selfServiceApi } from '@/lib/api/services';

export default function SelfServiceNotificationsRoute() {
  return (
    <NotificationsPage
      title="Notifications"
      description="Review client self-service alerts and mark them as read."
      service={selfServiceApi.notifications}
    />
  );
}
