export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins === 0) return `${(ms / 1000).toFixed(1)}s`;
  return `${mins}m ${secs}s`;
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const absMins = Math.floor(Math.abs(diffMs) / 60000);
  if (absMins < 1) return diffMs >= 0 ? 'Just now' : 'In <1m';
  if (absMins < 60) return diffMs >= 0 ? `${absMins}m ago` : `In ${absMins}m`;
  const absHours = Math.floor(absMins / 60);
  if (absHours < 24) return diffMs >= 0 ? `${absHours}h ago` : `In ${absHours}h`;
  const absDays = Math.floor(absHours / 24);
  return diffMs >= 0 ? `${absDays}d ago` : `In ${absDays}d`;
}

export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function downloadJsonFile(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
