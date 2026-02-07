'use client';

import { ConnectMetaButton } from './meta/ConnectMetaButton';

interface Props {
  brandId: string;
  showSyncButton?: boolean;
}

export function MetaConnectionStatus({ brandId }: Props) {
  return <ConnectMetaButton brandId={brandId} />;
}
