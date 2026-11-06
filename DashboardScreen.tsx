import { useCallback, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import logo from './assets/riskpro-logo.png';
import { formatTimestamp } from './content';
import {
  getDashboardCounts,
  getOperatorName,
  getRecentAssessments,
  type AssessmentSummary,
  type DashboardCounts,
} from './db';
import type { RootStackParamList, TabParamList } from './navigation';
import { colors } from './theme';
import { ActionButton, MutedText, ScreenScroll, StatusPill } from './ui';
import { useAssessmentStore } from './useAssessmentStore';

type DashboardNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Dashboard'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const EMPTY_COUNTS: DashboardCounts = { today: 0, drafts: 0, ready: 0, synced: 0 };

export function DashboardScreen() {
  const navigation = useNavigation<DashboardNavigation>();
  const reset = useAssessmentStore((state) => state.reset);
  const [operator, setOperator] = useState('Operator');
  const [counts, setCounts] = useState<DashboardCounts>(EMPTY_COUNTS);
  const [recent, setRecent] = useState<AssessmentSummary[]>([]);

  const reload = useCallback(async () => {
    const [name, nextCounts, nextRecent] = await Promise.all([
      getOperatorName(),
      getDashboardCounts(),
      getRecentAssessments(8),
    ]);
    setOperator(name.trim() === '' ? 'Operator' : name.trim());
    setCounts(nextCounts);
    setRecent(nextRecent);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const startNew = () => {
    reset();
    navigation.navigate('WizardModal');
  };

  const tiles: { label: string; value: number; onPress: () => void }[] = [
    { label: 'Today', value: counts.today, onPress: () => navigation.navigate('Records') },
    {
      label: 'Drafts',
      value: counts.drafts,
      onPress: () => navigation.navigate('Records', { status: 'DRAFT' }),
    },
    {
      label: 'Ready',
      value: counts.ready,
      onPress: () => navigation.navigate('Records', { status: 'READY' }),
    },
    {
      label: 'Submitted',
      value: counts.synced,
      onPress: () => navigation.navigate('Records', { status: 'SYNCED' }),
    },
  ];

  return (
    <ScreenScroll>
      <View style={styles.header}>
        <Image source={logo} style={styles.logo} accessibilityLabel="RiskPro" />
        <TouchableOpacity
          style={styles.cog}
          onPress={() => navigation.navigate('Profile')}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Ionicons name="cog" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>
      <Text style={styles.greeting}>{`Hello, ${operator}`}</Text>
      <MutedText>Pre-work risk assessment, stored on this tablet.</MutedText>
      <View style={styles.start}>
        <ActionButton icon="plus-circle" label="START NEW ASSESSMENT" onPress={startNew} />
      </View>
      <View style={styles.grid}>
        {tiles.map((tile) => (
          <TouchableOpacity key={tile.label} style={styles.tile} onPress={tile.onPress} accessibilityRole="button">
            <View style={styles.tileCard}>
              <Text style={styles.tileValue}>{tile.value}</Text>
              <Text style={styles.tileLabel}>{tile.label}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.section}>Recent</Text>
      {recent.length === 0 ? <MutedText>No assessments yet.</MutedText> : null}
      {recent.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.row}
          onPress={() => navigation.navigate('AssessmentReview', { id: item.id })}
          accessibilityRole="button"
        >
          <View style={styles.rowText}>
            <Text style={styles.job}>{item.job_task || 'Untitled task'}</Text>
            <Text style={styles.meta}>{`${item.workplace} · ${formatTimestamp(item.date)}`}</Text>
          </View>
          <StatusPill status={item.status} />
        </TouchableOpacity>
      ))}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  cog: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 4,
  },
  start: {
    marginTop: 20,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  tile: {
    width: '50%',
    padding: 6,
  },
  tileCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    minHeight: 96,
  },
  tileValue: {
    color: colors.orange,
    fontSize: 32,
    fontWeight: '700',
  },
  tileLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  section: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  rowText: {
    flex: 1,
  },
  job: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    color: colors.muted,
    marginTop: 4,
  },
});
