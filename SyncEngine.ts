import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';
import { getReadyAssessments, markAsSynced } from './db';

const SYNC_URL = 'https://api.riskpro.co.za/v1/sync';

export const SYNC_UNREACHABLE =
  'Surface sync server unreachable (SSL/Network error). Assessment stored securely offline.';

export type SyncResult = {
  success: boolean;
  error?: string;
  synced: number;
};

let syncing = false;

export function handleSyncOutcome(success: boolean): void {
  if (success) {
    Alert.alert(
      'Sync Complete',
      'All authorized assessments have uploaded to the surface database.',
    );
    return;
  }
  Alert.alert(
    'Saved Offline',
    'Your assessment is secured on this device. It will automatically upload to the surface database as soon as a network connection is detected.',
  );
}

export function startSyncEngine(): () => void {
  return NetInfo.addEventListener((state) => {
    if (state.isConnected === true && state.isInternetReachable === true) {
      void processSyncQueue();
    }
  });
}

export async function processSyncQueue(): Promise<SyncResult> {
  if (syncing) {
    return { success: false, error: 'A sync is already running.', synced: 0 };
  }
  syncing = true;
  let synced = 0;
  let rejected = false;
  try {
    const ready = await getReadyAssessments();
    for (const assessment of ready) {
      let response: Response | null = null;
      try {
        response = await fetch(SYNC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(assessment),
          signal: AbortSignal.timeout(20000),
        });
      } catch {
        return { success: false, error: SYNC_UNREACHABLE, synced };
      } finally {
        // Network, SSL, and timeout failures stay READY and never reach markAsSynced.
      }
      if (response !== null && response.status === 200) {
        await markAsSynced(assessment.id);
        synced += 1;
      } else {
        rejected = true;
      }
    }
    if (rejected && synced === 0) {
      return {
        success: false,
        error: 'The surface server did not accept the assessment. It stays ready on this device.',
        synced,
      };
    }
    return { success: true, synced };
  } catch {
    return { success: false, error: SYNC_UNREACHABLE, synced };
  } finally {
    syncing = false;
  }
}
