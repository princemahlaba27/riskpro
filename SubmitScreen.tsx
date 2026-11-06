import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getDashboardCounts } from './db';
import { processSyncQueue } from './SyncEngine';
import { colors } from './theme';
import { ActionButton, MutedText, ScreenScroll } from './ui';

export function SubmitScreen() {
  const [ready, setReady] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const reload = useCallback(async () => {
    const counts = await getDashboardCounts();
    setReady(counts.ready);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const onSync = async () => {
    if (syncing) {
      return;
    }
    setSyncing(true);
    try {
      const result = await processSyncQueue();
      await reload();
      if (!result.success) {
        Alert.alert('Sync', result.error ?? 'Sync failed.');
        return;
      }
      Alert.alert(
        'Sync',
        result.synced === 0
          ? 'No ready assessments to submit.'
          : `Submitted ${result.synced} assessment${result.synced === 1 ? '' : 's'}.`,
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <ScreenScroll>
      <Text style={styles.title}>Submit</Text>
      <MutedText>
        Ready assessments stay on this tablet until the surface server accepts them. A network or SSL
        failure leaves them ready.
      </MutedText>
      <View style={styles.countCard}>
        <Text style={styles.count}>{ready}</Text>
        <Text style={styles.countLabel}>Ready to submit</Text>
      </View>
      <ActionButton
        icon="upload-cloud"
        label={syncing ? 'SUBMITTING' : 'SYNC NOW'}
        disabled={syncing}
        onPress={() => {
          void onSync();
        }}
      />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  countCard: {
    marginTop: 20,
    marginBottom: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
  },
  count: {
    color: colors.orange,
    fontSize: 40,
    fontWeight: '700',
  },
  countLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
});
