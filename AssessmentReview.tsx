import { useCallback, useState } from 'react';
import { Alert, Image, Platform, StyleSheet, Text, View } from 'react-native';
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
import { handleSyncOutcome, processSyncQueue } from './SyncEngine';
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

async function handleExportPdf(htmlContent: string): Promise<void> {
  try {
    const file = await Print.printToFileAsync({ html: htmlContent, base64: false });
    let shareUri = file.uri;
    if (Platform.OS === 'android' && !shareUri.startsWith('file://')) {
      shareUri = `file://${shareUri}`;
    }
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('Sharing Unavailable', 'File sharing is not supported on this device.');
      return;
    }
    await Sharing.shareAsync(shareUri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: 'Export Risk Assessment PDF',
    });
  } catch (error) {
    console.error('PDF Export Failure:', error);
    const message = error instanceof Error ? error.message : String(error);
    Alert.alert('Export Failed', message);
  }
}

const ASSESSMENT_PAGE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: sans-serif; color: #111; font-size: 11px; margin: 0; }
    .title-block { border-bottom: 3px solid #FF5A00; margin-bottom: 10px; padding-bottom: 6px; }
    .title-block h1 { font-size: 20px; margin: 0; }
    .title-block p { margin: 2px 0 0; color: #FF5A00; font-weight: 700; letter-spacing: 1px; }
    table { width: 100%; border-collapse: collapse; margin: 0 0 8px; }
    th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; vertical-align: top; }
    th { background: #f4f4f4; }
    h2 { font-size: 13px; margin: 10px 0 4px; }
    .names { margin: 0; padding-left: 16px; }
    .signoff img { max-height: 72px; max-width: 220px; }
  </style>
</head>
<body>
  <div class="title-block">
    <h1>RiskPro</h1>
    <p>PRE-WORK RISK ASSESSMENT</p>
  </div>
  <table>
    <tr><th>Date</th><td>{{DATE}}</td><th>Shift</th><td>{{SHIFT}}</td></tr>
    <tr><th>Workplace</th><td>{{WORKPLACE}}</td><th>Department</th><td>{{DEPARTMENT}}</td></tr>
    <tr><th>Assessor</th><td colspan="3">{{ASSESSOR}}</td></tr>
    <tr><th>Permits</th><td colspan="3">{{PERMITS}}</td></tr>
  </table>
  <h2>Equipment / PPE</h2>
  <table>
    <tr><th>Equipment</th><td>{{EQUIPMENT}}</td></tr>
    <tr><th>PPE</th><td>{{PPE}}</td></tr>
  </table>
  <h2>Hazards</h2>
  <table>
    <tr><th>Hazard</th><th>Class</th><th>Controls</th><th>Status</th></tr>
    {{HAZARD_ROWS}}
  </table>
  <h2>Checklist</h2>
  <table>
    <tr><th>Question</th><th>YES/NO</th></tr>
    {{CHECKLIST_ROWS}}
  </table>
  <h2>Team signatures</h2>
  <ul class="names">{{TEAM_SIGNATURES}}</ul>
  <h2>Authorization</h2>
  <table class="signoff">
    <tr>
      <th>Lead Assessor</th>
      <th>Supervisor Authorization</th>
    </tr>
    <tr>
      <td>
        <div><strong>{{ASSESSOR_NAME}}</strong></div>
        <div>{{DATE}}</div>
        <div>{{ASSESSOR_SIG}}</div>
      </td>
      <td>
        <div><strong>{{SUPERVISOR_NAME}}</strong></div>
        <div>{{STATUS}}</div>
        <div>{{SUPERVISOR_DATE}}</div>
        <div>{{SUPERVISOR_SIG}}</div>
      </td>
    </tr>
  </table>
</body>
</html>`;

function fillAssessmentTemplate(values: Record<string, string>): string {
  return ASSESSMENT_PAGE_HTML.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match, key: string) => values[key] ?? '');
}

function listOrNone(items: readonly string[]): string {
  return items.length === 0 ? 'None' : items.join(', ');
}

function assessmentHtml(assessment: AssessmentV2): string {
  const permits = assessment.permits
    .filter((permit) => permit.active)
    .map((permit) => `${permit.name} ${permit.permit_number}`.trim());
  const hazardRows = assessment.hazards
    .map((hazard) => {
      const status = hazard.severity_class ? CLASS_ACTIONS[hazard.severity_class] : '';
      return `<tr><td>${escapeHtml(hazard.name)}</td><td>${escapeHtml(hazard.severity_class ?? '')}</td><td>${escapeHtml(hazard.controls)}</td><td>${escapeHtml(status)}</td></tr>`;
    })
    .join('');
  const checklistRows = CHECKLIST_QUESTIONS.map((question, index) => {
    const answer = assessment.checklist.answers[index];
    const yesNo = answer === 'YES' || answer === 'NO' ? answer : '';
    return `<tr><td>${escapeHtml(question)}</td><td>${escapeHtml(yesNo)}</td></tr>`;
  }).join('');
  const teamSignatures = assessment.team_members
    .map((member) => `<li>${escapeHtml(`${member.name} ${member.surname}`.trim())}</li>`)
    .join('');
  const assessorSignature = '<em>[Assessor Signature on Record]</em>';
  const supervisorSignature = assessment.supervisor_signature_uri
    ? `<img src="${escapeHtml(assessment.supervisor_signature_uri)}" alt="" />`
    : '[Pending Supervisor Authorization]';
  return fillAssessmentTemplate({
    DATE: escapeHtml(formatTimestamp(assessment.date)),
    SHIFT: escapeHtml(assessment.shift),
    WORKPLACE: escapeHtml(assessment.workplace),
    DEPARTMENT: escapeHtml(assessment.department),
    ASSESSOR: escapeHtml(assessment.assessor),
    ASSESSOR_NAME: escapeHtml(assessment.assessor),
    PERMITS: escapeHtml(listOrNone(permits)),
    EQUIPMENT: escapeHtml(listOrNone(assessment.equipment)),
    PPE: escapeHtml(listOrNone(assessment.ppe)),
    HAZARD_ROWS: hazardRows,
    CHECKLIST_ROWS: checklistRows,
    TEAM_SIGNATURES: teamSignatures,
    STATUS: escapeHtml(assessment.status),
    SUPERVISOR_NAME: '',
    SUPERVISOR_DATE: escapeHtml(
      assessment.supervisor_signed_at ? formatTimestamp(assessment.supervisor_signed_at) : '',
    ),
    ASSESSOR_SIG: assessorSignature,
    SUPERVISOR_SIG: supervisorSignature,
  });
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
      handleSyncOutcome(result.success);
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

  const onExport = () => {
    if (!assessment) {
      return;
    }
    void handleExportPdf(assessmentHtml(assessment));
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
