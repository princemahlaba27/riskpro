import { StyleSheet, View } from 'react-native';
import { ChoiceButton, Field, Label } from './ui';
import { useAssessmentStore } from './useAssessmentStore';

const EQUIPMENT = [
  'Cutting Torch',
  'Grinder',
  'Electric Drill',
  'Welding Machine',
  'Lifting Equipment',
  'Scaffolding',
  'Ladder',
  'Hand Tools',
  'Compressed Air',
] as const;

const PPE = [
  'Hard Hat',
  'Overall',
  'Safety Shoes',
  'Eye Protection',
  'Dust Mask',
  'Respirator',
  'Ear Protection',
  'Safety Gloves',
  'Reflective Vest',
  'Apron',
  'Spats',
  'Safety Harness',
  'Lifeline',
  'Sala Block/s',
  'Life Jacket',
  'Cap Lamp',
  'Self-Rescuer',
  'Fall Arrest Rig',
  'Gas Detector',
] as const;

export function Step2Permits() {
  const permits = useAssessmentStore((state) => state.permits);
  const equipment = useAssessmentStore((state) => state.equipment);
  const ppe = useAssessmentStore((state) => state.ppe);
  const togglePermit = useAssessmentStore((state) => state.togglePermit);
  const setPermitNumber = useAssessmentStore((state) => state.setPermitNumber);
  const toggleEquipment = useAssessmentStore((state) => state.toggleEquipment);
  const togglePpe = useAssessmentStore((state) => state.togglePpe);

  return (
    <View>
      <Label>PERMITS</Label>
      {permits.map((permit) => (
        <View key={permit.name} style={styles.permit}>
          <ChoiceButton
            label={permit.name}
            selected={permit.active}
            onPress={() => togglePermit(permit.name)}
          />
          {permit.active ? (
            <View>
              <Label>PERMIT NUMBER</Label>
              <Field
                value={permit.permit_number}
                onChangeText={(value) => setPermitNumber(permit.name, value)}
                placeholder="Permit number"
                autoCapitalize="characters"
              />
            </View>
          ) : null}
        </View>
      ))}

      <Label>EQUIPMENT</Label>
      <View style={styles.grid}>
        {EQUIPMENT.map((name) => (
          <ChoiceButton
            key={name}
            label={name}
            selected={equipment.includes(name)}
            onPress={() => toggleEquipment(name)}
            style={styles.cell}
          />
        ))}
      </View>

      <Label>PPE</Label>
      <View style={styles.grid}>
        {PPE.map((name) => (
          <ChoiceButton
            key={name}
            label={name}
            selected={ppe.includes(name)}
            onPress={() => togglePpe(name)}
            style={styles.cell}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  permit: {
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cell: {
    width: '47%',
    flexGrow: 1,
  },
});
