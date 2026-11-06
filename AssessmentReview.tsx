import { useCallback, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { CHECKLIST_QUESTIONS, CLASS_ACTIONS, escapeHtml, formatTimestamp } from './content';
import {
  commitSupervisorSignoff,
  getAssessmentById,
  type AssessmentV2,
} from './db';
import type { RootStackParamList } from './navigation';
import { SignaturePadModal } from './SignaturePadModal';
import { processSyncQueue } from './SyncEngine';
import { colors } from './theme';
import { ActionButton, BodyText, Card, MutedText, ScreenScroll, StatusPill } from './ui';

type Props = NativeStackScreenProps<RootStackParamList, 'AssessmentReview'>;

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function joinList(items: readonly string[]): string {
  return items.length === 0 ? 'None' : items.join(', ');
}

function assessmentHtml(assessment: AssessmentV2): string {
  const hazards = assessment.hazards
    .map((hazard) => {
      const klass = hazard.severity_class ?? '—';
      const action = hazard.severity_class ? CLASS_ACTIONS[hazard.severity_class] : '';
      return `<li>${escapeHtml(hazard.name)} — Class ${escapeHtml(klass)}${action ? ` (${escapeHtml(action)})` : ''}</li>`;
    })
    .join('');
  const checklist = CHECKLIST_QUESTIONS.map((question, index) => {
    const answer = assessment.checklist.answers[index] ?? '—';
    return `<li>${escapeHtml(question)}: ${escapeHtml(answer)}</li>`;
  }).join('');
  const team = assessment.team_members
    .map((member) => `<li>${escapeHtml(`${member.name} ${member.surname}`.trim())} — ${escapeHtml(member.occupation)}</li>`)
    .join('');
  const supervisor = assessment.supervisor_signature_uri ? 'Signed' : 'Not signed';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: sans-serif; color: #111; font-size: 12px; margin: 0; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    h2 { font-size: 14px; margin: 12px 0 4px; }
    p, li { margin: 2px 0; }
    ul { margin: 0; padding-left: 18px; }
  </style>
</head>
<body>
  <h1>RiskPro assessment</h1>
  <p><strong>Job:</strong> ${escapeHtml(assessment.job_task)}</p>
  <p><strong>Workplace:</strong> ${escapeHtml(assessment.workplace)}</p>
  <p><strong>Date:</strong> ${escapeHtml(formatTimestamp(assessment.date))}</p>
  <p><strong>Shift:</strong> ${escapeHtml(assessment.shift)}</p>
  <p><strong>Assessor:</strong> ${escapeHtml(assessment.assessor)}</p>
  <h2>Hazards</h2>
  <ul>${hazards || '<li>None</li>'}</ul>
  <h2>Checklist</h2>
  <ul>${checklist}</ul>
  ${assessment.checklist.rectify_action ? `<p><strong>Rectify:</strong> ${escapeHtml(assessment.checklist.rectify_action)}</p>` : ''}
  <h2>Team</h2>
  <ul>${team || '<li>None</li>'}</ul>
  <p><strong>Supervisor:</strong> ${supervisor}</p>
</body>
</html>`;
}

export function AssessmentReviewScreen({ navigation, route }: Props) {
  const [assessment, setAssessment] = useState<AssessmentV2 | null>(null);
  const [missing, setMissing] = useState(false);
  const [signing, setSigning] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const row = await getAssessmentById(route.params.id);
    setAssessment(row);
    setMissing(row === null);
  }, [route.params.id]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const onAuthorize = async (uri: string) => {
    setSigning(false);
    setBusy(true);
    try {
      await commitSupervisorSignoff(route.params.id, uri);
      await reload();
      Alert.alert('Authorized', 'Supervisor sign-off saved. Status is READY.');
    } catch (error) {
      Alert.alert('Sign-off was not saved', errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const onSync = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      const result = await processSyncQueue();
      await reload();
      if (!result.success) {
        Alert.alert('Sync', result.error ?? 'Sync failed.');
        return;
      }
      Alert.alert('Sync', result.synced === 0 ? 'The server did not confirm this assessment. It stays ready.' : 'Submitted to the surface server.');
    } finally {
      setBusy(false);
    }
  };

  const onPrint = async () => {
    if (!assessment) {
      return;
    }
    try {
      await Print.printAsync({ html: assessmentHtml(assessment), width: 595, height: 842 });
    } catch (error) {
      Alert.alert('Print failed', errorMessage(error));
    }
  };

  const onExport = async () => {
    if (!assessment) {
      return;
    }
    try {
      const file = await Print.printToFileAsync({
        html: assessmentHtml(assessment),
        width: 595,
        height: 842,
      });
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: 'Export assessment PDF',
      });
    } catch (error) {
      Alert.alert('Export failed', errorMessage(error));
    }
  };

  if (missing) {
    return (
      <ScreenScroll>
        <ActionButton tone="secondary" icon="arrow-left" label="BACK" onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Assessment not found</Text>
      </ScreenScroll>
    );
  }

  if (!assessment) {
    return (
      <ScreenScroll>
        <MutedText>Loading assessment…</MutedText>
      </ScreenScroll>
    );
  }

  const activePermits = assessment.permits.filter((permit) => permit.active);

  return (
    <ScreenScroll>
      <View style={styles.header}>
        <ActionButton tone="secondary" icon="arrow-left" label="BACK" onPress={() => navigation.goBack()} />
      </View>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{assessment.job_task || 'Assessment'}</Text>
        <StatusPill status={assessment.status} />
      </View>
      {assessment.status === 'SYNCED' ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{`Synced to Cloud on ${formatTimestamp(assessment.updated_at)}`}</Text>
        </View>
      ) : null}

      <Card title="Details">
        <BodyText>{`Date: ${formatTimestamp(assessment.date)}`}</BodyText>
        <BodyText>{`Shift: ${assessment.shift}`}</BodyText>
        <BodyText>{`Workplace: ${assessment.workplace}`}</BodyText>
        <BodyText>{`Department: ${assessment.department}`}</BodyText>
        <BodyText>{`Assessor: ${assessment.assessor}`}</BodyText>
        <BodyText>
          {activePermits.length === 0
            ? 'Permits: none'
            : `Permits: ${activePermits.map((permit) => `${permit.name} ${permit.permit_number}`.trim()).join(', ')}`}
        </BodyText>
      </Card>

      <Card title="Equipment / PPE">
        <BodyText>{`Equipment: ${joinList(assessment.equipment)}`}</BodyText>
        <BodyText>{`PPE: ${joinList(assessment.ppe)}`}</BodyText>
      </Card>

      <Card title="Hazards">
        {assessment.hazards.length === 0 ? <MutedText>No hazards recorded.</MutedText> : null}
        {assessment.hazards.map((hazard) => (
          <View key={hazard.name} style={styles.block}>
            <BodyText>{`${hazard.name} · Class ${hazard.severity_class ?? '—'}`}</BodyText>
            {hazard.severity_class ? <MutedText>{CLASS_ACTIONS[hazard.severity_class]}</MutedText> : null}
            <MutedText>{hazard.description || 'No description'}</MutedText>
            <MutedText>{hazard.controls || 'No controls'}</MutedText>
            <View style={styles.photos}>
              {hazard.photo_uris.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.photo} />
              ))}
            </View>
          </View>
        ))}
      </Card>

      <Card title="Checklist">
        {CHECKLIST_QUESTIONS.map((question, index) => (
          <BodyText key={question}>{`${assessment.checklist.answers[index] ?? '—'} — ${question}`}</BodyText>
        ))}
        {assessment.checklist.rectify_action ? (
          <BodyText>{`Rectify: ${assessment.checklist.rectify_action}`}</BodyText>
        ) : null}
      </Card>

      <Card title="Team signatures">
        {assessment.team_members.length === 0 ? <MutedText>No team members.</MutedText> : null}
        {assessment.team_members.map((member, index) => (
          <View key={`${member.name}-${member.surname}-${index}`} style={styles.block}>
            <BodyText>{`${member.name} ${member.surname}`.trim()}</BodyText>
            <MutedText>{member.occupation}</MutedText>
            {member.signature_uri ? (
              <Image source={{ uri: member.signature_uri }} style={styles.signature} />
            ) : (
              <MutedText>Not signed</MutedText>
            )}
          </View>
        ))}
      </Card>

      {assessment.status === 'DRAFT' ? (
        <View style={styles.actions}>
          <ActionButton
            icon="edit-2"
            label="AUTHORIZE & SIGN"
            disabled={busy}
            onPress={() => setSigning(true)}
          />
        </View>
      ) : null}

      {assessment.status === 'READY' ? (
        <View style={styles.actions}>
          <Text style={styles.signedLabel}>
            {assessment.supervisor_signed_at
              ? `Supervisor signed ${formatTimestamp(assessment.supervisor_signed_at)}`
              : 'Supervisor signed'}
          </Text>
          {assessment.supervisor_signature_uri ? (
            <Image source={{ uri: assessment.supervisor_signature_uri }} style={styles.signature} />
          ) : null}
          <ActionButton icon="upload-cloud" label="SYNC NOW" disabled={busy} onPress={() => void onSync()} />
        </View>
      ) : null}

      {assessment.status === 'SYNCED' && assessment.supervisor_signature_uri ? (
        <Image source={{ uri: assessment.supervisor_signature_uri }} style={styles.signature} />
      ) : null}

      <View style={styles.actions}>
        <ActionButton tone="secondary" icon="printer" label="PRINT ASSESSMENT" onPress={() => void onPrint()} />
      </View>
      <View style={styles.actions}>
        <ActionButton tone="secondary" icon="share" label="EXPORT PDF" onPress={() => void onExport()} />
      </View>

      <SignaturePadModal
        visible={signing}
        title="Supervisor sign-off"
        onClose={() => setSigning(false)}
        onSaved={(uri) => {
          void onAuthorize(uri);
        }}
      />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
  },
  banner: {
    backgroundColor: '#14532D',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  bannerText: {
    color: colors.green,
    fontWeight: '700',
    fontSize: 16,
  },
  block: {
    gap: 4,
    marginBottom: 8,
  },
  photos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: colors.input,
  },
  signature: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  actions: {
    marginBottom: 12,
  },
  signedLabel: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: 8,
  },
});
