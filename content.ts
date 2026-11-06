export const CHECKLIST_QUESTIONS = [
  'Are all persons competent in the task',
  'Does everyone have the correct PPE',
  'Do I have a procedure / defined safety precautions for the task',
  'Does everybody have the correct tools / equipment',
  'Are all tools / equipment in a good condition',
] as const;

export const CLASS_ACTIONS = {
  A: 'Stop and Fix Immediately',
  B: 'Fix within 24 hours',
  C: 'Fix within 3 days',
} as const;

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
