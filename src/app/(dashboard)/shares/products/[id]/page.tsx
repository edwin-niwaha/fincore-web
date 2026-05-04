import { ShareProductEditorPage } from '@/features/shares/share-product-editor-page';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ShareProductEditorPage productId={id} />;
}
