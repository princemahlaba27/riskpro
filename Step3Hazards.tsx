import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActionButton, ChoiceButton, Field, Label } from './ui';
import { useAssessmentStore } from './useAssessmentStore';

const HAZARDS = [
  'Fires / Open Flames',
  'Gas Welding',
  'Oil / Grease / Fuel Spills',
  'Air / Water / Soil Pollution',
  'Dust',
  'Fumes',
  'Sparks',
  'Suspended Loads',
  'Electric Shock',
  'Vibration',
  'Excessive Noise',
  'Excessive Heat',
  'Foreign Objects',
  'Falling Objects',
  'Stress / Fatigue',
  'Slip / Trip',
  'Material Handling',
  'Defective Tools',
  'Stored Energy',
  'Moving Machinery',
  'Moving Parts',
  'Lifting Tackle',
  'Corrosive Chemicals / Reagents',
  'Heavy Objects',
  'Working at Heights',
  'Deep Water',
  'Explosives',
  'Lightning',
  'Ergonomics',
  'Intoxication',
  'Rockfall',
  'Chemical Exposure',
] as const;

export function Step3Hazards() {
  const selectedHazards = useAssessmentStore((state) => state.selected_hazards);
  const toggleHazard = useAssessmentStore((state) => state.toggleHazard);
  const addCustomHazard = useAssessmentStore((state) => state.addCustomHazard);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const catalogue = new Set<string>(HAZARDS);
  const customSelected = selectedHazards.filter((name) => !catalogue.has(name));
  const blocks = [...HAZARDS, ...customSelected];

  const onAdd = () => {
    const trimmed = draft.trim();
    if (trimmed === '') {
      return;
    }
    const canonical = HAZARDS.find((name) => name.toLowerCase() === trimmed.toLowerCase()) ?? trimmed;
    addCustomHazard(canonical);
    setDraft('');
    setAdding(false);
  };

  return (
    <View>
      <Label>HAZARDS</Label>
      <View style={styles.grid}>
        {blocks.map((name) => (
          <ChoiceButton
            key={name}
            label={name}
            selected={selectedHazards.includes(name)}
            onPress={() => toggleHazard(name)}
            style={styles.cell}
          />
        ))}
      </View>
      <View style={styles.add}>
        <ActionButton
          icon="plus"
          label="ADD CUSTOM HAZARD"
          tone="secondary"
          onPress={() => setAdding(true)}
        />
      </View>
      {adding ? (
        <View>
          <Label>CUSTOM HAZARD</Label>
          <Field
            value={draft}
            onChangeText={setDraft}
            placeholder="Hazard not on the grid"
            autoCapitalize="words"
          />
          <View style={styles.add}>
            <ActionButton icon="plus" label="ADD" onPress={onAdd} disabled={draft.trim() === ''} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cell: {
    width: '47%',
    flexGrow: 1,
    minHeight: 88,
  },
  add: {
    marginTop: 12,
  },
});
