import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CHECKLIST_QUESTIONS } from './content';
import { colors } from './theme';
import { ActionButton, ChoiceButton, Field, Label } from './ui';
import { SignaturePadModal } from './SignaturePadModal';
import { useAssessmentStore, type ChecklistAnswer } from './useAssessmentStore';
import { occupationIsDigitsOnly, teamMemberReady } from './wizardGates';

const ANSWERS: ChecklistAnswer[] = ['YES', 'NO'];

export function Step5Signoff() {
  const answers = useAssessmentStore((state) => state.checklist_answers);
  const rectifyAction = useAssessmentStore((state) => state.rectify_action);
  const teamMembers = useAssessmentStore((state) => state.team_members);
  const setChecklistAnswer = useAssessmentStore((state) => state.setChecklistAnswer);
  const setRectifyAction = useAssessmentStore((state) => state.setRectifyAction);
  const addTeamMember = useAssessmentStore((state) => state.addTeamMember);
  const setTeamSignature = useAssessmentStore((state) => state.setTeamSignature);
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [occupation, setOccupation] = useState('');
  const [signingIndex, setSigningIndex] = useState<number | null>(null);

  const showRectify = answers.some((answer) => answer === 'NO');
  const digitsOnly = occupationIsDigitsOnly(occupation);
  const canAdd = teamMemberReady(name, surname, occupation);
  const signingMember = signingIndex !== null ? teamMembers[signingIndex] : undefined;

  const onAdd = () => {
    if (!canAdd) {
      return;
    }
    addTeamMember({ name, surname, occupation });
    setName('');
    setSurname('');
    setOccupation('');
  };

  return (
    <View>
      {CHECKLIST_QUESTIONS.map((question, questionIndex) => {
        const answer = answers[questionIndex] ?? null;
        return (
          <View key={question}>
            <Label>{question}</Label>
            <View style={styles.row}>
              {ANSWERS.map((choice) => (
                <ChoiceButton
                  key={choice}
                  label={choice ?? ''}
                  selected={answer === choice}
                  onPress={() => setChecklistAnswer(questionIndex, choice)}
                  style={styles.half}
                />
              ))}
            </View>
          </View>
        );
      })}

      {showRectify ? (
        <View>
          <Label>ACTION TAKEN TO RECTIFY</Label>
          <Field
            value={rectifyAction}
            onChangeText={setRectifyAction}
            placeholder="What was done before work can continue"
            multiline
          />
        </View>
      ) : null}

      <Text style={styles.section}>Team members</Text>
      <Label>NAME</Label>
      <Field value={name} onChangeText={setName} placeholder="First name" autoCapitalize="words" />
      <Label>SURNAME</Label>
      <Field value={surname} onChangeText={setSurname} placeholder="Surname" autoCapitalize="words" />
      <Label>OCCUPATION</Label>
      <Field
        value={occupation}
        onChangeText={setOccupation}
        placeholder="Role on this task"
        autoCapitalize="words"
      />
      {digitsOnly ? <Text style={styles.reject}>Occupation cannot be only numbers.</Text> : null}
      <View style={styles.add}>
        <ActionButton icon="plus" label="ADD" onPress={onAdd} disabled={!canAdd} />
      </View>

      {teamMembers.map((member, memberIndex) => (
        <View key={`${member.name}-${member.surname}-${memberIndex}`} style={styles.member}>
          <Text style={styles.memberName}>{`${member.name} ${member.surname}`.trim()}</Text>
          <Text style={styles.memberRole}>{member.occupation}</Text>
          {member.signature_uri ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>✓ Signed</Text>
            </View>
          ) : null}
          <ActionButton
            icon="edit-2"
            label="SIGN"
            tone={member.signature_uri ? 'secondary' : 'primary'}
            onPress={() => setSigningIndex(memberIndex)}
          />
        </View>
      ))}

      <SignaturePadModal
        visible={signingIndex !== null}
        title={signingMember ? `Sign — ${signingMember.name} ${signingMember.surname}`.trim() : 'Sign'}
        onClose={() => setSigningIndex(null)}
        onSaved={(uri) => {
          if (signingIndex !== null) {
            setTeamSignature(signingIndex, uri);
          }
          setSigningIndex(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  section: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 28,
  },
  reject: {
    color: colors.danger,
    marginTop: 8,
    fontWeight: '700',
  },
  add: {
    marginTop: 12,
  },
  member: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  memberName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  memberRole: {
    color: colors.muted,
    fontSize: 14,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#14532D',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: colors.green,
    fontWeight: '700',
  },
});
