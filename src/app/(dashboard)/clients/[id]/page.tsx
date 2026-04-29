'use client';

import { use } from 'react';
import { ClientProfileView } from '@/features/clients/client-profile';

export default function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ClientProfileView id={id} />;
}
