import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  draftSaveBlocks,
  signaturesBlock,
  step1Blocks,
  step2Blocks,
  step4Blocks,
  step5Blocks,
  teamMemberReady,
} from './wizardGates.ts';

const completeStep1 = {
  shift: 'Day',
  task: 'STOPE DRILLING',
  area: 'SHAFT 3',
  department: 'MINING',
  assessor: 'A. NKOMO',
};

test('step 1 blocks when any of shift, task, area, department, or assessor is null or blank', () => {
  const fields = ['shift', 'task', 'area', 'department', 'assessor'] as const;
  for (const field of fields) {
    assert.equal(step1Blocks({ ...completeStep1, [field]: null }), true, `${field} null`);
    assert.equal(step1Blocks({ ...completeStep1, [field]: '' }), true, `${field} empty`);
    assert.equal(step1Blocks({ ...completeStep1, [field]: '   ' }), true, `${field} blank`);
  }
});

test('step 1 passes when shift, task, area, department, and assessor are non-empty', () => {
  assert.equal(step1Blocks(completeStep1), false);
  assert.equal(step1Blocks({ ...completeStep1, shift: 'Night' }), false);
});

test('step 2 passes with no active permits', () => {
  assert.equal(step2Blocks({ permits: [] }), false);
  assert.equal(
    step2Blocks({
      permits: [
        { name: 'Hot Work', active: false, permit_number: '' },
        { name: 'Confined Space', active: false, permit_number: '   ' },
      ],
    }),
    false,
  );
});

test('step 2 blocks when Hot Work is active and permit_number is blank', () => {
  assert.equal(
    step2Blocks({
      permits: [{ name: 'Hot Work', active: true, permit_number: '' }],
    }),
    true,
  );
  assert.equal(
    step2Blocks({
      permits: [{ name: 'Hot Work', active: true, permit_number: '   ' }],
    }),
    true,
  );
});

test('step 2 passes when the Hot Work number is HW-12', () => {
  assert.equal(
    step2Blocks({
      permits: [{ name: 'Hot Work', active: true, permit_number: 'HW-12' }],
    }),
    false,
  );
});

const completeHazard = {
  name: 'Dust',
  severity_class: 'A' as const,
  description: 'Visible dust at the face',
  controls: 'Water spray',
};

test('step 4 blocks when one hazard lacks severity, description, or controls', () => {
  assert.equal(
    step4Blocks({ hazards: [{ ...completeHazard, severity_class: null }] }),
    true,
  );
  assert.equal(step4Blocks({ hazards: [{ ...completeHazard, description: '' }] }), true);
  assert.equal(step4Blocks({ hazards: [{ ...completeHazard, description: '   ' }] }), true);
  assert.equal(step4Blocks({ hazards: [{ ...completeHazard, controls: '' }] }), true);
  assert.equal(step4Blocks({ hazards: [{ ...completeHazard, controls: '   ' }] }), true);
  assert.equal(
    step4Blocks({
      hazards: [
        completeHazard,
        { name: 'Excessive Noise', severity_class: null, description: 'Loud', controls: 'Plugs' },
      ],
    }),
    true,
  );
});

test('step 4 passes when every hazard has all three', () => {
  assert.equal(
    step4Blocks({
      hazards: [
        completeHazard,
        {
          name: 'Excessive Noise',
          severity_class: 'C',
          description: 'Continuous plant noise',
          controls: 'Hearing protection',
        },
      ],
    }),
    false,
  );
});

test('step 4 passes when there are no selected hazards', () => {
  assert.equal(step4Blocks({ hazards: [] }), false);
});

test('step 5 blocks when a checklist item is unanswered', () => {
  assert.equal(
    step5Blocks({ answers: ['YES', 'YES', 'YES', 'YES', null], rectify: '' }),
    true,
  );
  assert.equal(step5Blocks({ answers: ['YES', 'YES', 'YES', 'YES'], rectify: 'done' }), true);
});

test('step 5 blocks when any item is NO and the rectify text is blank', () => {
  assert.equal(
    step5Blocks({ answers: ['YES', 'NO', 'YES', 'YES', 'YES'], rectify: '' }),
    true,
  );
  assert.equal(
    step5Blocks({ answers: ['YES', 'NO', 'YES', 'YES', 'YES'], rectify: '   ' }),
    true,
  );
});

test('step 5 passes when that rectify text is non-blank', () => {
  assert.equal(
    step5Blocks({
      answers: ['YES', 'NO', 'YES', 'YES', 'YES'],
      rectify: 'Stopped the task and issued the missing PPE',
    }),
    false,
  );
  assert.equal(
    step5Blocks({ answers: ['YES', 'YES', 'YES', 'YES', 'YES'], rectify: '' }),
    false,
  );
});

test('signaturesBlock does not require a supervisor signature', () => {
  assert.equal(signaturesBlock({ supervisor_signature_uri: null, team_members: [] }), false);
  assert.equal(signaturesBlock({ supervisor_signature_uri: '', team_members: [] }), false);
  assert.equal(signaturesBlock({ supervisor_signature_uri: '   ', team_members: [] }), false);
  assert.equal(
    signaturesBlock({
      supervisor_signature_uri: null,
      team_members: [{ signature_uri: 'file:///member-a.png' }],
    }),
    false,
  );
});

test('signaturesBlock is true when any team member uri is null or blank', () => {
  assert.equal(
    signaturesBlock({
      supervisor_signature_uri: 'file:///supervisor.png',
      team_members: [{ signature_uri: 'file:///member.png' }, { signature_uri: null }],
    }),
    true,
  );
  assert.equal(
    signaturesBlock({
      supervisor_signature_uri: null,
      team_members: [{ signature_uri: '' }],
    }),
    true,
  );
  assert.equal(
    signaturesBlock({
      supervisor_signature_uri: 'file:///supervisor.png',
      team_members: [{ signature_uri: '   ' }],
    }),
    true,
  );
});

test('signaturesBlock is false when every member has a uri', () => {
  assert.equal(
    signaturesBlock({
      supervisor_signature_uri: 'file:///supervisor.png',
      team_members: [
        { signature_uri: 'file:///member-a.png' },
        { signature_uri: 'file:///member-b.png' },
      ],
    }),
    false,
  );
});

test('signaturesBlock is false when the team list is empty', () => {
  assert.equal(
    signaturesBlock({
      supervisor_signature_uri: 'file:///supervisor.png',
      team_members: [],
    }),
    false,
  );
});

test('teamMemberReady rejects an occupation that is only digits', () => {
  assert.equal(teamMemberReady('Anele', 'Nkomo', '12'), false);
  assert.equal(teamMemberReady('Anele', 'Nkomo', 'Miner'), true);
  assert.equal(teamMemberReady('', 'Nkomo', 'Miner'), false);
});

test('draft save does not require a supervisor signature', () => {
  assert.equal(
    draftSaveBlocks({
      step1: completeStep1,
      step2: { permits: [] },
      step4: { hazards: [completeHazard] },
      step5: { answers: ['YES', 'YES', 'YES', 'YES', 'YES'], rectify: '' },
      signatures: { supervisor_signature_uri: null, team_members: [] },
    }),
    false,
  );
});
