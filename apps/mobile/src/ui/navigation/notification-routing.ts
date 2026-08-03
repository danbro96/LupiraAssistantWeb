import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

// A notice tap deep-links into the app. The payload carries only a target + item id (the hub keeps
// content off the relay), so routing is a switch, not a parser.

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export interface NoticeData {
  target?: unknown;
  itemId?: unknown;
}

export function routeNotice(data: NoticeData | undefined): void {
  if (!navigationRef.isReady()) return;
  const target = typeof data?.target === 'string' ? data.target : 'inbox';
  switch (target) {
    case 'archive':
      navigationRef.navigate('Tabs', { screen: 'ArchiveTab' });
      break;
    default:
      navigationRef.navigate('Tabs', { screen: 'InboxTab' });
      break;
  }
}
