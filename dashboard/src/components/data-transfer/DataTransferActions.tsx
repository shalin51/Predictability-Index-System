import { useRef, useState } from 'react';
import { downloadDataTransferWorkbook, importDataTransferWorkbook } from '../../services/api';
import { colors, font, spacing } from '../../theme/tokens';
import { Button } from '../ui/Button';

export function DataTransferActions({ onImported, resource }: { onImported?: () => void; resource: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const download = async (mode: 'export' | 'template') => {
    setBusy(true); setStatus('');
    try { await downloadDataTransferWorkbook(resource, mode); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Download failed'); }
    finally { setBusy(false); }
  };

  const upload = async (file: File) => {
    setBusy(true); setStatus('');
    try {
      const result = await importDataTransferWorkbook(resource, file);
      setStatus(`Imported ${result.processed}: ${result.created} created, ${result.updated} updated${result.skipped ? `, ${result.skipped} skipped` : ''}.`);
      onImported?.();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: spacing.space2 }}>
      <input
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        aria-label={`Import ${resource}`}
        hidden
        onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }}
        ref={inputRef}
        type="file"
      />
      <Button disabled={busy} onClick={() => inputRef.current?.click()} size="sm" variant="secondary">Import</Button>
      <Button disabled={busy} onClick={() => void download('export')} size="sm" variant="secondary">Export</Button>
      <Button disabled={busy} onClick={() => void download('template')} size="sm" variant="subtle">Template</Button>
      {status && <span aria-live="polite" style={{ color: colors.text.muted, fontSize: font.size.small, maxWidth: 340 }}>{status}</span>}
    </div>
  );
}
