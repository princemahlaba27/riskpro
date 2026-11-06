import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { formatTimestamp } from './content';
import { listAssessmentsByStatus, type AssessmentSummary, type AssessmentV2Status } from './db';
import type { RootStackParamList, TabParamList } from './navigation';
import { colors } from './theme';
import { MutedText, ScreenScroll, StatusPill } from './ui';

type RecordsNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Records'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const FILTERS: { label: string; value: AssessmentV2Status | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Ready', value: 'READY' },
  { label: 'Submitted', value: 'SYNCED' },
];

export function RecordsScreen() {
  const navigation = useNavigation<RecordsNavigation>();
  const route = useRoute<RouteProp<TabParamList, 'Records'>>();
  const [filter, setFilter] = useState<AssessmentV2Status | 'ALL'>(route.params?.status ?? 'ALL');
  const [rows, setRows] = useState<AssessmentSummary[]>([]);

  useEffect(() => {
    if (route.params?.status) {
      setFilter(route.params.status);
    }
  }, [route.params?.status]);

  const reload = useCallback(async () => {
    const next = await listAssessmentsByStatus(filter === 'ALL' ? undefined : filter);
    setRows(next);
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return (
    <ScreenScroll>
      <Text style={styles.title}>Records</Text>
      <View style={styles.filters}>
        {FILTERS.map((item) => {
          const selected = filter === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              style={[styles.filter, selected ? styles.filterOn : styles.filterOff]}
              onPress={() => setFilter(item.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={styles.filterText}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {rows.length === 0 ? <MutedText>No records in this filter.</MutedText> : null}
      {rows.map((item) => (
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
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filter: {
    minHeight: 64,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOn: {
    backgroundColor: colors.orange,
  },
  filterOff: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterText: {
    color: colors.text,
    fontWeight: '700',
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
