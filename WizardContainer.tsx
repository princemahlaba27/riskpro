import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { saveDraftAssessment } from './db';
import { Step1Details } from './Step1Details';
import { Step2Permits } from './Step2Permits';
import { Step3Hazards } from './Step3Hazards';
import { Step4Classify } from './Step4Classify';
import { Step5Signoff } from './Step5Signoff';
import { colors } from './theme';
import { ActionButton, ScreenScroll } from './ui';
import { useAssessmentStore, type WizardStep } from './useAssessmentStore';
import {
  checklistPassed,
  draftSaveBlocks,
  step1Blocks,
  step1MissingLabels,
  step2BlockingPermitNames,
  step2Blocks,
  step4Blocks,
  step4IncompleteHazardNames,
  step5Blocks,
} from './wizardGates';

const STEP_TITLES = [
  'Assessment details',
  'Permits and equipment',
  'Energy and hazards',
  'Classify each hazard',
  'Checklist and team',
] as const;

function nextStep(step: WizardStep): WizardStep {
  if (step === 1) return 2;
  if (step === 2) return 3;
  if (step === 3) return 4;
  return 5;
}

function previousStep(step: WizardStep): WizardStep {
  if (step === 5) return 4;
  if (step === 4) return 3;
  if (step === 3) return 2;
  return 1;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function WizardContainer({
  onDraftSaved,
  onRequestDiscard,
}: {
  onDraftSaved: () => void;
  onRequestDiscard: () => void;
}) {
  const step = useAssessmentStore((state) => state.step);
  const shift = useAssessmentStore((state) => state.shift);
  const task = useAssessmentStore((state) => state.task);
  const area = useAssessmentStore((state) => state.area);
  const department = useAssessmentStore((state) => state.department);
  const assessor = useAssessmentStore((state) => state.assessor);
  const permits = useAssessmentStore((state) => state.permits);
  const classifiedHazards = useAssessmentStore((state) => state.classified_hazards);
  const checklistAnswers = useAssessmentStore((state) => state.checklist_answers);
  const rectifyAction = useAssessmentStore((state) => state.rectify_action);
  const supervisorSignature = useAssessmentStore((state) => state.supervisor_signature_uri);
  const teamMembers = useAssessmentStore((state) => state.team_members);
  const setStep = useAssessmentStore((state) => state.setStep);
  const reset = useAssessmentStore((state) => state.reset);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const step1State = { shift, task, area, department, assessor };
  const step2State = { permits };
  const step4State = { hazards: classifiedHazards };
  const step5State = { answers: checklistAnswers, rectify: rectifyAction };
  const signatureState = {
    supervisor_signature_uri: supervisorSignature,
    team_members: teamMembers,
  };
  const gateState = {
    step1: step1State,
    step2: step2State,
    step4: step4State,
    step5: step5State,
    signatures: signatureState,
  };
  const blockStep1 = step === 1 && step1Blocks(step1State);
  const blockStep2 = step === 2 && step2Blocks(step2State);
  const blockStep4 = step === 4 && step4Blocks(step4State);
  const saveBlocked = draftSaveBlocks(gateState) || saving;
  const nextDisabled = blockStep1 || blockStep2 || blockStep4;

  const notices = [
    ...(step === 1 ? step1MissingLabels(step1State) : []),
    ...(step === 2 ? step2BlockingPermitNames(step2State) : []),
    ...(step === 4 || step === 5 ? step4IncompleteHazardNames(step4State) : []),
    ...(step === 5 && step5Blocks(step5State) ? ['Answer the checklist. A NO needs a rectify note.'] : []),
    ...(step === 5 && signatureState.team_members.some((member) => !member.signature_uri?.trim())
      ? ['Each added team member must sign.']
      : []),
  ];

  const onBack = () => {
    if (step === 1) {
      onRequestDiscard();
      return;
    }
    setStep(previousStep(step));
  };

  const onNext = () => {
    if (nextDisabled || step === 5) {
      return;
    }
    setStep(nextStep(step));
  };

  const onSaveDraft = async () => {
    if (savingRef.current) {
      return;
    }
    const draft = useAssessmentStore.getState();
    const blocked = draftSaveBlocks({
      step1: {
        shift: draft.shift,
        task: draft.task,
        area: draft.area,
        department: draft.department,
        assessor: draft.assessor,
      },
      step2: { permits: draft.permits },
      step4: { hazards: draft.classified_hazards },
      step5: { answers: draft.checklist_answers, rectify: draft.rectify_action },
      signatures: {
        supervisor_signature_uri: draft.supervisor_signature_uri,
        team_members: draft.team_members,
      },
    });
    if (blocked) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      let assessmentId = draft.assessment_local_id;
      if (assessmentId === null) {
        assessmentId = randomUUID();
        useAssessmentStore.getState().setAssessmentLocalId(assessmentId);
      }
      await saveDraftAssessment({
        id: assessmentId,
        date: draft.date,
        shift: draft.shift ?? '',
        job_task: draft.task ?? '',
        workplace: draft.area ?? '',
        department: draft.department ?? '',
        assessor: draft.assessor ?? '',
        permits: draft.permits,
        equipment: draft.equipment,
        ppe: draft.ppe,
        hazards: draft.classified_hazards,
        checklist: {
          answers: draft.checklist_answers,
          rectify_action: draft.rectify_action,
          passed: checklistPassed(draft.checklist_answers),
        },
        team_members: draft.team_members,
      });
      reset();
      onDraftSaved();
      Alert.alert('Draft saved successfully. Ready for supervisor review.');
    } catch (error) {
      Alert.alert('Draft was not saved', errorMessage(error));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <ScreenScroll
      footer={
        <>
          <ActionButton flex tone="secondary" icon="arrow-left" label="Back" onPress={onBack} />
          {step === 5 ? (
            <ActionButton
              flex
              icon="save"
              label="SAVE DRAFT"
              disabled={saveBlocked}
              onPress={() => {
                void onSaveDraft();
              }}
            />
          ) : (
            <ActionButton flex icon="arrow-right" label="Next" disabled={nextDisabled} onPress={onNext} />
          )}
        </>
      }
    >
      <Text style={styles.progressLabel}>{`Step ${step} of 5: ${STEP_TITLES[step - 1]}`}</Text>
      <View style={styles.segments}>
        {STEP_TITLES.map((title, index) => (
          <View
            key={title}
            style={[styles.segment, index < step ? styles.segmentOn : styles.segmentOff]}
          />
        ))}
      </View>
      {step === 1 ? <Step1Details /> : null}
      {step === 2 ? <Step2Permits /> : null}
      {step === 3 ? <Step3Hazards /> : null}
      {step === 4 ? <Step4Classify /> : null}
      {step === 5 ? <Step5Signoff /> : null}
      {notices.length > 0 ? (
        <View style={styles.notice}>
          {notices.map((notice) => (
            <Text key={notice} style={styles.noticeText}>
              {notice}
            </Text>
          ))}
        </View>
      ) : null}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  progressLabel: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  segments: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  segmentOn: {
    backgroundColor: colors.orange,
  },
  segmentOff: {
    backgroundColor: colors.border,
  },
  notice: {
    marginTop: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.orange,
    padding: 14,
    gap: 6,
  },
  noticeText: {
    color: colors.text,
    fontWeight: '700',
  },
});
