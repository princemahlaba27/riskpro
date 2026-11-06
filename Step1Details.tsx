import { StyleSheet, Text, View } from 'react-native';
import { formatTimestamp } from './content';
import { colors } from './theme';
import { ChoiceButton, Field, Label } from './ui';
import { useAssessmentStore, type Shift } from './useAssessmentStore';

const SHIFTS: { value: Shift; label: string }[] = [
  { value: 'Day', label: 'DAY' },
  { value: 'Night', label: 'NIGHT' },
];

export function Step1Details() {
  const date = useAssessmentStore((state) => state.date);
  const shift = useAssessmentStore((state) => state.shift);
  const task = useAssessmentStore((state) => state.task);
  const area = useAssessmentStore((state) => state.area);
  const department = useAssessmentStore((state) => state.department);
  const assessor = useAssessmentStore((state) => state.assessor);
  const patch = useAssessmentStore((state) => state.patch);

  return (
    <View>
      <Label>DATE</Label>
      <Text style={styles.dateValue}>{formatTimestamp(date)}</Text>

      <Label>SHIFT</Label>
      <View style={styles.row}>
        {SHIFTS.map((option) => (
          <ChoiceButton
            key={option.value}
            label={option.label}
            selected={shift === option.value}
            onPress={() => patch({ shift: option.value })}
            style={styles.shift}
          />
        ))}
      </View>

      <Label>JOB / TASK</Label>
      <Field
        value={task ?? ''}
        onChangeText={(value) => patch({ task: value })}
        placeholder="Stope drilling, belt maintenance"
        autoCapitalize="words"
      />

      <Label>WORKPLACE</Label>
      <Field
        value={area ?? ''}
        onChangeText={(value) => patch({ area: value })}
        placeholder="Shaft 3, Level 42"
        autoCapitalize="words"
      />

      <Label>DEPARTMENT</Label>
      <Field
        value={department ?? ''}
        onChangeText={(value) => patch({ department: value })}
        placeholder="Mining, Engineering, SHEQ"
        autoCapitalize="words"
      />

      <Label>ASSESSOR</Label>
      <Field
        value={assessor ?? ''}
        onChangeText={(value) => patch({ assessor: value })}
        placeholder="Lead assessor name"
        autoCapitalize="words"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dateValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    minHeight: 32,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  shift: {
    flex: 1,
  },
});
