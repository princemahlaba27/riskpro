import { randomUUID } from 'expo-crypto';
import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'riskpro.db';
const LEGACY_MIGRATION = '001_legacy_assessments_v2';

export type SyncStatus = 'pending' | 'synced' | 'failed';

export type SeverityClass = 'A' | 'B' | 'C';

export type AssessmentInput = {
  shift: string;
  task: string;
  area: string;
  department: string;
  assessor: string;
  permit_numbers: string[];
  checklist_passed: boolean;
};

export type AssessmentRow = {
  local_id: string;
  sync_status: SyncStatus;
  shift: string;
  task: string;
  area: string;
  department: string;
  assessor: string;
  permit_numbers: string[];
  checklist_passed: boolean;
};

export type HazardInput = {
  energy_type: string;
  severity_class: SeverityClass;
  description: string;
  controls: string;
  photo_uris: string[];
};

export type HazardRow = {
  local_id: string;
  sync_status: SyncStatus;
  assessment_id: string;
  energy_type: string;
  severity_class: SeverityClass;
  description: string;
  controls: string;
  photo_uris: string[];
};

export type SignatureRole = 'supervisor' | 'team';

export type SignatureInput = {
  signer_name: string;
  signer_role: SignatureRole;
  signature_uri: string;
};

export type SignatureRow = {
  local_id: string;
  sync_status: SyncStatus;
  assessment_id: string;
  signer_name: string;
  signer_role: string;
  signature_uri: string;
};

export type AssessmentCommit = AssessmentInput & {
  local_id: string;
};

type AssessmentRecord = {
  local_id: string;
  sync_status: string;
  shift: string;
  task: string;
  area: string;
  department: string;
  assessor: string;
  permit_numbers: string;
  checklist_passed: number;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS Assessments (
  local_id TEXT PRIMARY KEY NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  shift TEXT NOT NULL,
  task TEXT NOT NULL,
  area TEXT NOT NULL,
  department TEXT NOT NULL,
  assessor TEXT NOT NULL,
  permit_numbers TEXT NOT NULL,
  checklist_passed INTEGER NOT NULL CHECK (checklist_passed IN (0, 1))
);

CREATE TABLE IF NOT EXISTS Hazards (
  local_id TEXT PRIMARY KEY NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  assessment_id TEXT NOT NULL REFERENCES Assessments(local_id) ON DELETE CASCADE,
  energy_type TEXT NOT NULL,
  severity_class TEXT NOT NULL CHECK (severity_class IN ('A', 'B', 'C')),
  description TEXT NOT NULL,
  controls TEXT NOT NULL,
  photo_uris TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Signatures (
  local_id TEXT PRIMARY KEY NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  assessment_id TEXT NOT NULL REFERENCES Assessments(local_id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_role TEXT NOT NULL,
  signature_uri TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS assessments_sync_status ON Assessments (sync_status);
CREATE INDEX IF NOT EXISTS hazards_assessment_id ON Hazards (assessment_id);
CREATE INDEX IF NOT EXISTS hazards_sync_status ON Hazards (sync_status);
CREATE INDEX IF NOT EXISTS signatures_assessment_id ON Signatures (assessment_id);
`;

// assessments_v2 is the live document table. The name "assessments" is never
// used: Android SQLite folds it into the legacy Assessments table.
const V2_SCHEMA = `
CREATE TABLE IF NOT EXISTS assessments_v2 (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL,
  shift TEXT NOT NULL,
  job_task TEXT NOT NULL,
  workplace TEXT NOT NULL,
  department TEXT NOT NULL,
  assessor TEXT NOT NULL,
  permits TEXT NOT NULL,
  equipment TEXT NOT NULL,
  ppe TEXT NOT NULL,
  hazards TEXT NOT NULL,
  checklist TEXT NOT NULL,
  team_members TEXT NOT NULL,
  supervisor_signature_uri TEXT,
  supervisor_signed_at TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'READY', 'SYNCED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS assessments_v2_status ON assessments_v2 (status);
CREATE INDEX IF NOT EXISTS assessments_v2_updated_at ON assessments_v2 (updated_at);
`;

export type AssessmentV2Status = 'DRAFT' | 'READY' | 'SYNCED';

export type PermitRecord = {
  name: string;
  active: boolean;
  permit_number: string;
};

export type HazardRecord = {
  name: string;
  severity_class: SeverityClass | null;
  description: string;
  controls: string;
  photo_uris: string[];
};

export type ChecklistAnswerValue = 'YES' | 'NO' | null;

export type ChecklistRecord = {
  answers: ChecklistAnswerValue[];
  rectify_action: string;
  passed: boolean;
};

export type TeamMemberRecord = {
  name: string;
  surname: string;
  occupation: string;
  signature_uri: string | null;
};

export type AssessmentV2 = {
  id: string;
  date: string;
  shift: string;
  job_task: string;
  workplace: string;
  department: string;
  assessor: string;
  permits: PermitRecord[];
  equipment: string[];
  ppe: string[];
  hazards: HazardRecord[];
  checklist: ChecklistRecord;
  team_members: TeamMemberRecord[];
  supervisor_signature_uri: string | null;
  supervisor_signed_at: string | null;
  status: AssessmentV2Status;
  created_at: string;
  updated_at: string;
};

export type AssessmentSummary = {
  id: string;
  job_task: string;
  workplace: string;
  date: string;
  status: AssessmentV2Status;
};

export type DashboardCounts = {
  today: number;
  drafts: number;
  ready: number;
  synced: number;
};

export type SaveDraftInput = {
  id: string;
  date: string;
  shift: string;
  job_task: string;
  workplace: string;
  department: string;
  assessor: string;
  permits: unknown;
  equipment: unknown;
  ppe: unknown;
  hazards: unknown;
  checklist: unknown;
  team_members: unknown;
};

type AssessmentV2Row = {
  id: string;
  date: string;
  shift: string;
  job_task: string;
  workplace: string;
  department: string;
  assessor: string;
  permits: string;
  equipment: string;
  ppe: string;
  hazards: string;
  checklist: string;
  team_members: string;
  supervisor_signature_uri: string | null;
  supervisor_signed_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type LegacyHazardRow = {
  energy_type: string;
  severity_class: string;
  description: string;
  controls: string;
  photo_uris: string;
};

type LegacySignatureRow = {
  signer_name: string;
  signer_role: string;
  signature_uri: string;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

function assertSeverityClass(value: string): asserts value is SeverityClass {
  if (value !== 'A' && value !== 'B' && value !== 'C') {
    throw new Error(
      `severity_class must be 'A', 'B', or 'C'. Received ${JSON.stringify(value)}.`,
    );
  }
}

function asSyncStatus(value: string): SyncStatus {
  if (value === 'pending' || value === 'synced' || value === 'failed') {
    return value;
  }
  throw new Error(`Invalid sync_status ${JSON.stringify(value)}.`);
}

function asV2Status(value: string): AssessmentV2Status {
  if (value === 'DRAFT' || value === 'READY' || value === 'SYNCED') {
    return value;
  }
  return 'DRAFT';
}

function parseJsonStringArray(value: string, column: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`${column} is not valid JSON.`);
  }
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
    throw new Error(`${column} must be a JSON array of strings.`);
  }
  return parsed;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

function asPermits(value: unknown): PermitRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const permits: PermitRecord[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const record = item as Record<string, unknown>;
    permits.push({
      name: typeof record.name === 'string' ? record.name : 'Permit',
      active: record.active === true,
      permit_number: typeof record.permit_number === 'string' ? record.permit_number : '',
    });
  }
  return permits;
}

function asHazards(value: unknown): HazardRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const hazards: HazardRecord[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const record = item as Record<string, unknown>;
    const severity = record.severity_class;
    hazards.push({
      name: typeof record.name === 'string' ? record.name : '',
      severity_class: severity === 'A' || severity === 'B' || severity === 'C' ? severity : null,
      description: typeof record.description === 'string' ? record.description : '',
      controls: typeof record.controls === 'string' ? record.controls : '',
      photo_uris: asStringArray(record.photo_uris),
    });
  }
  return hazards;
}

function asChecklist(value: unknown): ChecklistRecord {
  const answers: ChecklistAnswerValue[] = [null, null, null, null, null];
  if (!value || typeof value !== 'object') {
    return { answers, rectify_action: '', passed: false };
  }
  const record = value as Record<string, unknown>;
  const raw = Array.isArray(record.answers) ? record.answers : [];
  for (let index = 0; index < answers.length; index += 1) {
    const answer = raw[index];
    answers[index] = answer === 'YES' || answer === 'NO' ? answer : null;
  }
  return {
    answers,
    rectify_action: typeof record.rectify_action === 'string' ? record.rectify_action : '',
    passed: record.passed === true,
  };
}

function asTeam(value: unknown): TeamMemberRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const members: TeamMemberRecord[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const record = item as Record<string, unknown>;
    members.push({
      name: typeof record.name === 'string' ? record.name : '',
      surname: typeof record.surname === 'string' ? record.surname : '',
      occupation: typeof record.occupation === 'string' ? record.occupation : '',
      signature_uri: typeof record.signature_uri === 'string' ? record.signature_uri : null,
    });
  }
  return members;
}

function hydrate(row: AssessmentV2Row): AssessmentV2 {
  return {
    id: row.id,
    date: row.date,
    shift: row.shift,
    job_task: row.job_task,
    workplace: row.workplace,
    department: row.department,
    assessor: row.assessor,
    permits: asPermits(parseJson(row.permits)),
    equipment: asStringArray(parseJson(row.equipment)),
    ppe: asStringArray(parseJson(row.ppe)),
    hazards: asHazards(parseJson(row.hazards)),
    checklist: asChecklist(parseJson(row.checklist)),
    team_members: asTeam(parseJson(row.team_members)),
    supervisor_signature_uri: row.supervisor_signature_uri,
    supervisor_signed_at: row.supervisor_signed_at,
    status: asV2Status(row.status),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function splitSignerName(full: string): { name: string; surname: string } {
  const trimmed = full.trim();
  const space = trimmed.indexOf(' ');
  if (space < 0) {
    return { name: trimmed, surname: '' };
  }
  return { name: trimmed.slice(0, space), surname: trimmed.slice(space + 1).trim() };
}

async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  // Per connection. CASCADE does not run while this is off.
  await db.execAsync('PRAGMA foreign_keys = ON');
  const foreignKeys = await db.getAllAsync<{ foreign_keys: number }>('PRAGMA foreign_keys');
  if (Number(foreignKeys[0]?.foreign_keys) !== 1) {
    throw new Error('SQLite foreign keys are disabled; ON DELETE CASCADE will not run.');
  }
  await db.execAsync('PRAGMA journal_mode = WAL');
  await db.execAsync(SCHEMA);
  await ensureSignatureColumns(db);
  await db.execAsync(V2_SCHEMA);
  await migrateLegacyAssessments(db);
  return db;
}

const SIGNATURE_COLUMN_ALTERS = [
  "ALTER TABLE Signatures ADD COLUMN signer_name TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE Signatures ADD COLUMN signer_role TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE Signatures ADD COLUMN signature_uri TEXT NOT NULL DEFAULT ''",
] as const;

async function ensureSignatureColumns(db: SQLite.SQLiteDatabase): Promise<void> {
  for (const statement of SIGNATURE_COLUMN_ALTERS) {
    try {
      await db.execAsync(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.toLowerCase().includes('duplicate column')) {
        throw error;
      }
    }
  }
}

async function migrateLegacyAssessments(db: SQLite.SQLiteDatabase): Promise<void> {
  const applied = await db.getFirstAsync<{ version: string }>(
    'SELECT version FROM schema_migrations WHERE version = ?',
    LEGACY_MIGRATION,
  );
  if (applied) {
    return;
  }

  const rows = await db.getAllAsync<AssessmentRecord>(
    `SELECT
      local_id,
      sync_status,
      shift,
      task,
      area,
      department,
      assessor,
      permit_numbers,
      checklist_passed
    FROM Assessments`,
  );
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      const hazardRows = await db.getAllAsync<LegacyHazardRow>(
        `SELECT energy_type, severity_class, description, controls, photo_uris
         FROM Hazards WHERE assessment_id = ?`,
        row.local_id,
      );
      const signatureRows = await db.getAllAsync<LegacySignatureRow>(
        `SELECT signer_name, signer_role, signature_uri
         FROM Signatures WHERE assessment_id = ?`,
        row.local_id,
      );

      let permitNumbers: string[] = [];
      try {
        permitNumbers = parseJsonStringArray(row.permit_numbers, 'permit_numbers');
      } catch {
        permitNumbers = [];
      }

      const permits = permitNumbers
        .filter((permitNumber) => permitNumber.trim() !== '')
        .map((permitNumber) => ({
          name: 'Permit',
          active: true,
          permit_number: permitNumber,
        }));

      const hazards = hazardRows.map((hazard) => {
        let photoUris: string[] = [];
        try {
          photoUris = parseJsonStringArray(hazard.photo_uris, 'photo_uris');
        } catch {
          photoUris = [];
        }
        return {
          name: hazard.energy_type,
          severity_class: hazard.severity_class,
          description: hazard.description,
          controls: hazard.controls,
          photo_uris: photoUris,
        };
      });

      const supervisor = [...signatureRows]
        .reverse()
        .find((signature) => signature.signer_role === 'supervisor');
      const teamMembers = signatureRows
        .filter((signature) => signature.signer_role !== 'supervisor')
        .map((signature) => {
          const parts = splitSignerName(signature.signer_name);
          return {
            name: parts.name,
            surname: parts.surname,
            occupation: '',
            signature_uri: signature.signature_uri,
          };
        });

      const passed = row.checklist_passed === 1;
      const status: AssessmentV2Status = row.sync_status === 'synced' ? 'SYNCED' : 'DRAFT';
      const supervisorUri = supervisor?.signature_uri?.trim() ? supervisor.signature_uri : null;

      await db.runAsync(
        `INSERT OR IGNORE INTO assessments_v2 (
          id, date, shift, job_task, workplace, department, assessor,
          permits, equipment, ppe, hazards, checklist, team_members,
          supervisor_signature_uri, supervisor_signed_at, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        row.local_id,
        now,
        row.shift,
        row.task,
        row.area,
        row.department,
        row.assessor,
        JSON.stringify(permits),
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify(hazards),
        JSON.stringify({
          answers: passed ? ['YES', 'YES', 'YES', 'YES', 'YES'] : [null, null, null, null, null],
          rectify_action: '',
          passed,
        }),
        JSON.stringify(teamMembers),
        supervisorUri,
        status === 'SYNCED' && supervisorUri ? now : null,
        status,
        now,
        now,
      );
    }

    await db.runAsync(
      'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
      LEGACY_MIGRATION,
      now,
    );
  });
}

async function ensureAssessmentsV2Permits(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(assessments_v2)');
    const hasPermits = columns.some((column) => column.name === 'permits');
    if (!hasPermits) {
      await db.execAsync('ALTER TABLE assessments_v2 ADD COLUMN permits TEXT');
    }
  } catch (error) {
    console.warn('Migration warning for assessments_v2:', error);
  }
}

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabase()
      .then(async (db) => {
        await ensureAssessmentsV2Permits(db);
        return db;
      })
      .catch((error: unknown) => {
        databasePromise = null;
        throw error;
      });
  }
  return databasePromise;
}

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  return initDatabase();
}

export async function insertAssessment(input: AssessmentInput): Promise<string> {
  const db = await getDatabase();
  const localId = randomUUID();
  await db.runAsync(
    `INSERT INTO Assessments (
      local_id,
      sync_status,
      shift,
      task,
      area,
      department,
      assessor,
      permit_numbers,
      checklist_passed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    localId,
    'pending',
    input.shift,
    input.task,
    input.area,
    input.department,
    input.assessor,
    JSON.stringify(input.permit_numbers),
    input.checklist_passed ? 1 : 0,
  );
  return localId;
}

export async function insertHazards(
  assessmentId: string,
  hazards: readonly HazardInput[],
): Promise<string[]> {
  for (const hazard of hazards) {
    assertSeverityClass(hazard.severity_class);
  }

  const db = await getDatabase();
  const localIds: string[] = [];

  await db.withTransactionAsync(async () => {
    for (const hazard of hazards) {
      const localId = randomUUID();
      await db.runAsync(
        `INSERT INTO Hazards (
          local_id,
          sync_status,
          assessment_id,
          energy_type,
          severity_class,
          description,
          controls,
          photo_uris
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        localId,
        'pending',
        assessmentId,
        hazard.energy_type,
        hazard.severity_class,
        hazard.description,
        hazard.controls,
        JSON.stringify(hazard.photo_uris),
      );
      localIds.push(localId);
    }
  });

  return localIds;
}

export async function commitFullAssessment(
  assessment: AssessmentCommit,
  hazards: readonly HazardInput[],
  signatures: readonly SignatureInput[],
): Promise<void> {
  for (const hazard of hazards) {
    assertSeverityClass(hazard.severity_class);
  }

  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO Assessments (
        local_id,
        sync_status,
        shift,
        task,
        area,
        department,
        assessor,
        permit_numbers,
        checklist_passed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      assessment.local_id,
      'pending',
      assessment.shift,
      assessment.task,
      assessment.area,
      assessment.department,
      assessment.assessor,
      JSON.stringify(assessment.permit_numbers),
      assessment.checklist_passed ? 1 : 0,
    );

    for (const hazard of hazards) {
      const localId = randomUUID();
      await db.runAsync(
        `INSERT INTO Hazards (
          local_id,
          sync_status,
          assessment_id,
          energy_type,
          severity_class,
          description,
          controls,
          photo_uris
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        localId,
        'pending',
        assessment.local_id,
        hazard.energy_type,
        hazard.severity_class,
        hazard.description,
        hazard.controls,
        JSON.stringify(hazard.photo_uris),
      );
    }

    for (const signature of signatures) {
      const localId = randomUUID();
      await db.runAsync(
        `INSERT INTO Signatures (
          local_id,
          sync_status,
          assessment_id,
          signer_name,
          signer_role,
          signature_uri
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        localId,
        'pending',
        assessment.local_id,
        signature.signer_name,
        signature.signer_role,
        signature.signature_uri,
      );
    }
  });
}

export async function getPendingAssessments(): Promise<AssessmentRow[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<AssessmentRecord>(
    `SELECT
      local_id,
      sync_status,
      shift,
      task,
      area,
      department,
      assessor,
      permit_numbers,
      checklist_passed
    FROM Assessments
    WHERE sync_status = ?`,
    'pending',
  );

  return rows.map((row) => ({
    local_id: row.local_id,
    sync_status: asSyncStatus(row.sync_status),
    shift: row.shift,
    task: row.task,
    area: row.area,
    department: row.department,
    assessor: row.assessor,
    permit_numbers: parseJsonStringArray(row.permit_numbers, 'permit_numbers'),
    checklist_passed: row.checklist_passed === 1,
  }));
}

export async function markAssessmentSynced(local_id: string): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE Assessments SET sync_status = 'synced' WHERE local_id = ?`,
      local_id,
    );
    await db.runAsync(
      `UPDATE Hazards SET sync_status = 'synced' WHERE assessment_id = ?`,
      local_id,
    );
    await db.runAsync(
      `UPDATE Signatures SET sync_status = 'synced' WHERE assessment_id = ?`,
      local_id,
    );
  });
}

export async function saveDraftAssessment(input: SaveDraftInput): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO assessments_v2 (
      id, date, shift, job_task, workplace, department, assessor,
      permits, equipment, ppe, hazards, checklist, team_members,
      supervisor_signature_uri, supervisor_signed_at, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'DRAFT', ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      date = excluded.date,
      shift = excluded.shift,
      job_task = excluded.job_task,
      workplace = excluded.workplace,
      department = excluded.department,
      assessor = excluded.assessor,
      permits = excluded.permits,
      equipment = excluded.equipment,
      ppe = excluded.ppe,
      hazards = excluded.hazards,
      checklist = excluded.checklist,
      team_members = excluded.team_members,
      supervisor_signature_uri = NULL,
      supervisor_signed_at = NULL,
      status = 'DRAFT',
      updated_at = excluded.updated_at`,
    input.id,
    input.date,
    input.shift,
    input.job_task,
    input.workplace,
    input.department,
    input.assessor,
    JSON.stringify(input.permits),
    JSON.stringify(input.equipment),
    JSON.stringify(input.ppe),
    JSON.stringify(input.hazards),
    JSON.stringify(input.checklist),
    JSON.stringify(input.team_members),
    now,
    now,
  );
}

export async function commitSupervisorSignoff(id: string, signatureUri: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `UPDATE assessments_v2
     SET supervisor_signature_uri = ?,
         supervisor_signed_at = ?,
         status = 'READY',
         updated_at = ?
     WHERE id = ?`,
    signatureUri,
    now,
    now,
    id,
  );
  if (result.changes === 0) {
    throw new Error('Assessment not found.');
  }
}

export async function getDashboardCounts(): Promise<DashboardCounts> {
  const db = await getDatabase();
  const today = new Date().toISOString().slice(0, 10);
  const row = await db.getFirstAsync<{
    today: number | null;
    drafts: number | null;
    ready: number | null;
    synced: number | null;
  }>(
    `SELECT
      SUM(CASE WHEN substr(date, 1, 10) = ? THEN 1 ELSE 0 END) AS today,
      SUM(CASE WHEN status = 'DRAFT' THEN 1 ELSE 0 END) AS drafts,
      SUM(CASE WHEN status = 'READY' THEN 1 ELSE 0 END) AS ready,
      SUM(CASE WHEN status = 'SYNCED' THEN 1 ELSE 0 END) AS synced
     FROM assessments_v2`,
    today,
  );
  return {
    today: Number(row?.today ?? 0),
    drafts: Number(row?.drafts ?? 0),
    ready: Number(row?.ready ?? 0),
    synced: Number(row?.synced ?? 0),
  };
}

export async function getAssessmentById(id: string): Promise<AssessmentV2 | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<AssessmentV2Row>(
    `SELECT
      id, date, shift, job_task, workplace, department, assessor,
      permits, equipment, ppe, hazards, checklist, team_members,
      supervisor_signature_uri, supervisor_signed_at, status, created_at, updated_at
     FROM assessments_v2 WHERE id = ?`,
    id,
  );
  return row ? hydrate(row) : null;
}

export async function getRecentAssessments(limit = 8): Promise<AssessmentSummary[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<AssessmentSummary>(
    `SELECT id, job_task, workplace, date, status
     FROM assessments_v2
     ORDER BY updated_at DESC
     LIMIT ?`,
    limit,
  );
  return rows.map((row) => ({ ...row, status: asV2Status(row.status) }));
}

export async function listAssessmentsByStatus(
  status?: AssessmentV2Status,
): Promise<AssessmentSummary[]> {
  const db = await getDatabase();
  const rows = status
    ? await db.getAllAsync<AssessmentSummary>(
        `SELECT id, job_task, workplace, date, status
         FROM assessments_v2
         WHERE status = ?
         ORDER BY updated_at DESC`,
        status,
      )
    : await db.getAllAsync<AssessmentSummary>(
        `SELECT id, job_task, workplace, date, status
         FROM assessments_v2
         ORDER BY updated_at DESC`,
      );
  return rows.map((row) => ({ ...row, status: asV2Status(row.status) }));
}

export async function getReadyAssessments(): Promise<AssessmentV2[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<AssessmentV2Row>(
    `SELECT
      id, date, shift, job_task, workplace, department, assessor,
      permits, equipment, ppe, hazards, checklist, team_members,
      supervisor_signature_uri, supervisor_signed_at, status, created_at, updated_at
     FROM assessments_v2
     WHERE status = 'READY'
     ORDER BY updated_at ASC`,
  );
  return rows.map(hydrate);
}

export async function markAsSynced(id: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE assessments_v2 SET status = 'SYNCED', updated_at = ? WHERE id = ?`,
    now,
    id,
  );
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await getSetting('device_id');
  if (existing && existing.trim() !== '') {
    return existing;
  }
  const id = randomUUID();
  await setSetting('device_id', id);
  return id;
}

export async function getOperatorName(): Promise<string> {
  return (await getSetting('operator_name')) ?? '';
}

export async function setOperatorName(name: string): Promise<void> {
  await setSetting('operator_name', name);
}
