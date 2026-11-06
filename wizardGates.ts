export type Step1GateState = {
  shift: string | null;
  task: string | null;
  area: string | null;
  department: string | null;
  assessor: string | null;
};

export type PermitGate = {
  name: string;
  active: boolean;
  permit_number: string;
};

export type Step2GateState = {
  permits: readonly PermitGate[];
};

const STEP1_FIELDS = [
  { key: 'shift', label: 'SHIFT' },
  { key: 'task', label: 'JOB/TASK' },
  { key: 'area', label: 'WORKPLACE' },
  { key: 'department', label: 'DEPARTMENT' },
  { key: 'assessor', label: 'ASSESSOR' },
] as const;

function isBlank(value: string | null): boolean {
  return value === null || value.trim() === '';
}

function permitNumberMissing(permit: PermitGate): boolean {
  return permit.active && permit.permit_number.trim() === '';
}

export function step1MissingLabels(state: Step1GateState): string[] {
  return STEP1_FIELDS.filter((field) => isBlank(state[field.key])).map((field) => field.label);
}

export function step1Blocks(state: Step1GateState): boolean {
  return step1MissingLabels(state).length > 0;
}

export function step2BlockingPermitNames(state: Step2GateState): string[] {
  return state.permits.filter(permitNumberMissing).map((permit) => permit.name);
}

export function step2Blocks(state: Step2GateState): boolean {
  return state.permits.some(permitNumberMissing);
}

export type ClassifiedHazardGate = {
  name: string;
  severity_class: 'A' | 'B' | 'C' | null;
  description: string;
  controls: string;
};

export type Step4GateState = {
  hazards: readonly ClassifiedHazardGate[];
};

export type ChecklistAnswer = 'YES' | 'NO' | null;

export type Step5GateState = {
  answers: readonly ChecklistAnswer[];
  rectify: string;
};

const CHECKLIST_LENGTH = 5;

function hazardIncomplete(hazard: ClassifiedHazardGate): boolean {
  return (
    hazard.severity_class === null ||
    hazard.description.trim() === '' ||
    hazard.controls.trim() === ''
  );
}

export function step4IncompleteHazardNames(state: Step4GateState): string[] {
  return state.hazards.filter(hazardIncomplete).map((hazard) => hazard.name);
}

export function step4Blocks(state: Step4GateState): boolean {
  return state.hazards.some(hazardIncomplete);
}

export function step5Blocks(state: Step5GateState): boolean {
  const unanswered =
    state.answers.length !== CHECKLIST_LENGTH ||
    state.answers.some((answer) => answer === null);
  const rectifyMissing =
    state.answers.some((answer) => answer === 'NO') && state.rectify.trim() === '';
  return unanswered || rectifyMissing;
}

export function checklistPassed(answers: readonly ChecklistAnswer[]): boolean {
  return answers.length === CHECKLIST_LENGTH && answers.every((answer) => answer === 'YES');
}

export type SignatureMemberGate = {
  signature_uri: string | null;
};

export type SignatureGateState = {
  supervisor_signature_uri: string | null;
  team_members: readonly SignatureMemberGate[];
};

export function signaturesBlock(state: SignatureGateState): boolean {
  return state.team_members.some((member) => isBlank(member.signature_uri));
}

export function occupationIsDigitsOnly(occupation: string): boolean {
  return /^\d+$/.test(occupation.trim());
}

export function teamMemberReady(name: string, surname: string, occupation: string): boolean {
  return (
    name.trim() !== '' &&
    surname.trim() !== '' &&
    occupation.trim() !== '' &&
    !occupationIsDigitsOnly(occupation)
  );
}

export type DraftGateState = {
  step1: Step1GateState;
  step2: Step2GateState;
  step4: Step4GateState;
  step5: Step5GateState;
  signatures: SignatureGateState;
};

export function draftSaveBlocks(state: DraftGateState): boolean {
  return (
    step1Blocks(state.step1) ||
    step2Blocks(state.step2) ||
    step4Blocks(state.step4) ||
    step5Blocks(state.step5) ||
    signaturesBlock(state.signatures)
  );
}
