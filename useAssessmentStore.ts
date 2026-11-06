import { create } from 'zustand';
import type { AssessmentInput, HazardInput } from './db';

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export type Shift = 'Day' | 'Night';

export type PermitDraft = {
  name: string;
  active: boolean;
  permit_number: string;
};

export type SeverityClass = 'A' | 'B' | 'C';

export type ClassifiedHazard = {
  name: string;
  severity_class: SeverityClass | null;
  description: string;
  controls: string;
  photo_uris: string[];
};

export type ChecklistAnswer = 'YES' | 'NO' | null;

export type TeamMember = {
  name: string;
  surname: string;
  occupation: string;
  signature_uri: string | null;
};

const PERMIT_NAMES = [
  'Hot Work',
  'Confined Space',
  'Working at Height',
  'Deep Excavation',
  'High Voltage',
  'Working with Nitrogen',
  'Working near Water',
  'Live Testing',
] as const;

const CHECKLIST_LENGTH = 5;

export type AssessmentDraft = {
  step: WizardStep;
  date: string;
  shift: AssessmentInput['shift'] | null;
  task: AssessmentInput['task'] | null;
  area: AssessmentInput['area'] | null;
  department: AssessmentInput['department'] | null;
  assessor: AssessmentInput['assessor'] | null;
  permits: PermitDraft[];
  permit_numbers: AssessmentInput['permit_numbers'];
  equipment: string[];
  ppe: string[];
  selected_hazards: string[];
  classified_hazards: ClassifiedHazard[];
  hazards_array: HazardInput[];
  checklist_answers: ChecklistAnswer[];
  rectify_action: string;
  checklist_passed: AssessmentInput['checklist_passed'];
  team_members: TeamMember[];
  supervisor_signature_uri: string | null;
  assessment_local_id: string | null;
};

export type AssessmentPatch = Partial<
  Omit<AssessmentDraft, 'step' | 'date' | 'permit_numbers' | 'assessment_local_id'>
>;

type AssessmentStore = AssessmentDraft & {
  setStep: (step: WizardStep) => void;
  patch: (fields: AssessmentPatch) => void;
  togglePermit: (name: string) => void;
  setPermitNumber: (name: string, permitNumber: string) => void;
  toggleEquipment: (name: string) => void;
  togglePpe: (name: string) => void;
  toggleHazard: (name: string) => void;
  addCustomHazard: (name: string) => void;
  setHazardSeverity: (name: string, severity: SeverityClass) => void;
  setHazardDescription: (name: string, description: string) => void;
  setHazardControls: (name: string, controls: string) => void;
  addHazardPhoto: (name: string, uri: string) => void;
  removeHazardPhoto: (name: string, uri: string) => void;
  setChecklistAnswer: (index: number, answer: ChecklistAnswer) => void;
  setRectifyAction: (rectify: string) => void;
  addTeamMember: (member: { name: string; surname: string; occupation: string }) => void;
  setTeamSignature: (index: number, uri: string) => void;
  setSupervisorSignature: (uri: string) => void;
  setAssessmentLocalId: (localId: string) => void;
  reset: () => void;
};

function initialPermits(): PermitDraft[] {
  return PERMIT_NAMES.map((name) => ({
    name,
    active: false,
    permit_number: '',
  }));
}

function permitNumbersFrom(permits: readonly PermitDraft[]): string[] {
  return permits.filter((permit) => permit.active).map((permit) => permit.permit_number.trim());
}

function toggleMember(list: readonly string[], name: string): string[] {
  if (list.includes(name)) {
    return list.filter((item) => item !== name);
  }
  return [...list, name];
}

function blankHazard(name: string): ClassifiedHazard {
  return {
    name,
    severity_class: null,
    description: '',
    controls: '',
    photo_uris: [],
  };
}

function alignHazards(
  selected: readonly string[],
  existing: readonly ClassifiedHazard[],
): ClassifiedHazard[] {
  return selected.map((name) => existing.find((hazard) => hazard.name === name) ?? blankHazard(name));
}

function updateHazard(
  hazards: readonly ClassifiedHazard[],
  name: string,
  update: (hazard: ClassifiedHazard) => ClassifiedHazard,
): ClassifiedHazard[] {
  return hazards.map((hazard) => (hazard.name === name ? update(hazard) : hazard));
}

function blankChecklist(): ChecklistAnswer[] {
  return Array.from({ length: CHECKLIST_LENGTH }, () => null);
}

function initialDraft(): AssessmentDraft {
  const permits = initialPermits();
  return {
    step: 1,
    date: new Date().toISOString(),
    shift: null,
    task: null,
    area: null,
    department: null,
    assessor: null,
    permits,
    permit_numbers: permitNumbersFrom(permits),
    equipment: [],
    ppe: [],
    selected_hazards: [],
    classified_hazards: [],
    hazards_array: [],
    checklist_answers: blankChecklist(),
    rectify_action: '',
    checklist_passed: false,
    team_members: [],
    supervisor_signature_uri: null,
    assessment_local_id: null,
  };
}

export const useAssessmentStore = create<AssessmentStore>((set) => ({
  ...initialDraft(),
  setStep: (step) => set({ step }),
  patch: (fields) =>
    set((state) => {
      const next: Partial<AssessmentDraft> = { ...fields };
      if (fields.permits) {
        next.permit_numbers = permitNumbersFrom(fields.permits);
      }
      if (fields.selected_hazards) {
        next.classified_hazards = alignHazards(
          fields.selected_hazards,
          fields.classified_hazards ?? state.classified_hazards,
        );
      }
      return next;
    }),
  togglePermit: (name) =>
    set((state) => {
      const permits = state.permits.map((permit) =>
        permit.name === name ? { ...permit, active: !permit.active } : permit,
      );
      return { permits, permit_numbers: permitNumbersFrom(permits) };
    }),
  setPermitNumber: (name, permitNumber) =>
    set((state) => {
      const permits = state.permits.map((permit) =>
        permit.name === name ? { ...permit, permit_number: permitNumber } : permit,
      );
      return { permits, permit_numbers: permitNumbersFrom(permits) };
    }),
  toggleEquipment: (name) =>
    set((state) => ({ equipment: toggleMember(state.equipment, name) })),
  togglePpe: (name) => set((state) => ({ ppe: toggleMember(state.ppe, name) })),
  toggleHazard: (name) =>
    set((state) => {
      const selected_hazards = toggleMember(state.selected_hazards, name);
      return {
        selected_hazards,
        classified_hazards: alignHazards(selected_hazards, state.classified_hazards),
      };
    }),
  addCustomHazard: (name) =>
    set((state) => {
      const trimmed = name.trim();
      if (trimmed === '' || state.selected_hazards.includes(trimmed)) {
        return {};
      }
      const selected_hazards = [...state.selected_hazards, trimmed];
      return {
        selected_hazards,
        classified_hazards: alignHazards(selected_hazards, state.classified_hazards),
      };
    }),
  setHazardSeverity: (name, severity) =>
    set((state) => ({
      classified_hazards: updateHazard(state.classified_hazards, name, (hazard) => ({
        ...hazard,
        severity_class: severity,
      })),
    })),
  setHazardDescription: (name, description) =>
    set((state) => ({
      classified_hazards: updateHazard(state.classified_hazards, name, (hazard) => ({
        ...hazard,
        description,
      })),
    })),
  setHazardControls: (name, controls) =>
    set((state) => ({
      classified_hazards: updateHazard(state.classified_hazards, name, (hazard) => ({
        ...hazard,
        controls,
      })),
    })),
  addHazardPhoto: (name, uri) =>
    set((state) => ({
      classified_hazards: updateHazard(state.classified_hazards, name, (hazard) => ({
        ...hazard,
        photo_uris: [...hazard.photo_uris, uri],
      })),
    })),
  removeHazardPhoto: (name, uri) =>
    set((state) => ({
      classified_hazards: updateHazard(state.classified_hazards, name, (hazard) => ({
        ...hazard,
        photo_uris: hazard.photo_uris.filter((item) => item !== uri),
      })),
    })),
  setChecklistAnswer: (index, answer) =>
    set((state) => ({
      checklist_answers: state.checklist_answers.map((current, itemIndex) =>
        itemIndex === index ? answer : current,
      ),
    })),
  setRectifyAction: (rectify) => set({ rectify_action: rectify }),
  addTeamMember: (member) =>
    set((state) => {
      const name = member.name.trim();
      const surname = member.surname.trim();
      const occupation = member.occupation.trim();
      if (name === '' && surname === '' && occupation === '') {
        return {};
      }
      return {
        team_members: [
          ...state.team_members,
          { name, surname, occupation, signature_uri: null },
        ],
      };
    }),
  setTeamSignature: (index, uri) =>
    set((state) => ({
      team_members: state.team_members.map((member, memberIndex) =>
        memberIndex === index ? { ...member, signature_uri: uri } : member,
      ),
    })),
  setSupervisorSignature: (uri) => set({ supervisor_signature_uri: uri }),
  setAssessmentLocalId: (localId) => set({ assessment_local_id: localId }),
  reset: () => set(initialDraft()),
}));
