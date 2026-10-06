import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../upstream/index.js';
import { ShadcnButton } from './shadcn-button.js';
import { ShadcnTextInput } from './shadcn-text-input.js';
import type { ShadcnInputType } from './shadcn-text-input.js';
import { editDialogProfile as defaultProfile } from '../profile/edit-dialog-profile.js';
import type { ProjectProfile } from '../profile/types.js';

export interface EditDialogField {
  name: string;
  label: string;
  /** initial value (controlled seed); value/defaultValue are honored at open */
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  type?: ShadcnInputType;
  description?: string;
  error?: boolean;
  autoComplete?: string;
}

export type EditDialogCloseReason =
  | 'save'
  | 'cancel'
  | 'x'
  | 'discard'
  | 'pending-confirm';

export interface EditDialogOpenChangeDetail {
  open: boolean;
  reason: EditDialogCloseReason;
}

export interface EditDialogProps {
  open: boolean;
  /** Host owns open; the reference never mutates state on its own. */
  onOpenChange: (detail: EditDialogOpenChangeDetail) => void;
  /** R1-DLG-01: label is the accessible name source (rendered as DialogTitle). */
  label: string;
  description?: string;
  fields: EditDialogField[];
  onSave: (values: Record<string, string>) => Promise<void> | void;
  /**
   * Blocking variant (exception EX-BLK-001): the ordinary cancel entry and X
   * control are removed; only resolution paths (save / discard) can close.
   */
  blocking?: boolean;
  /** Tests/reference inject the same frozen profile; defaults to the R1 profile. */
  profile?: ProjectProfile;
  className?: string;
}

function initialValues(fields: EditDialogField[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) out[f.name] = f.value ?? f.defaultValue ?? '';
  return out;
}

/**
 * D17 in-repo reference instance: composition of vendored shadcn
 * Dialog/Button/Input + the D16 Project Profile, demonstrating one complete
 * compliant realization. Thin composition only — upstream primitives are not
 * re-implemented.
 */
export function EditDialog({
  open,
  onOpenChange,
  label,
  description,
  fields,
  onSave,
  blocking = false,
  profile = defaultProfile,
  className,
}: EditDialogProps): React.ReactElement {
  const conv = profile.dialogConventions;
  const [values, setValues] = React.useState<Record<string, string>>(() => initialValues(fields));
  const [pending, setPending] = React.useState(false);
  const [saveAttempts, setSaveAttempts] = React.useState(0);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  // R1-DLG-05: a close requested while pending waits for an explicit confirm.
  const [pendingCloseReason, setPendingCloseReason] = React.useState<EditDialogCloseReason | null>(null);

  // Re-seed draft values each time the dialog opens.
  React.useEffect(() => {
    if (open) {
      setValues(initialValues(fields));
      setSaveAttempts(0);
      setSaveError(null);
      setPendingCloseReason(null);
    }
  }, [open]);

  const retryLimit = conv.blocking.failureFallback.retryLimit;
  const saveExhausted = blocking && saveAttempts > retryLimit;

  const closeWith = React.useCallback(
    (reason: EditDialogCloseReason) => {
      onOpenChange({ open: false, reason });
    },
    [onOpenChange],
  );

  // R1-DLG-02 / R1-DLG-05: close requests during pending are never silent.
  const requestClose = React.useCallback(
    (reason: EditDialogCloseReason) => {
      if (pending) {
        setPendingCloseReason(reason);
        return;
      }
      closeWith(reason);
    },
    [pending, closeWith],
  );

  const handleSave = React.useCallback(async () => {
    if (pending || saveExhausted) return; // R1-DLG-04: block resubmit while pending
    setSaveError(null);
    setPending(true);
    try {
      await onSave(values);
      setPending(false);
      closeWith('save');
    } catch (error) {
      setPending(false);
      setSaveAttempts((n) => n + 1);
      setSaveError(error instanceof Error ? error.message : String(error));
    }
  }, [pending, saveExhausted, onSave, values, closeWith]);

  const primary = profile.variants[conv.primaryVariant]?.tokenOverrides.variant ?? 'default';
  const cancel = profile.variants[conv.cancelVariant]?.tokenOverrides.variant ?? 'outline';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Esc / overlay are preventDefault-ed below; the only remaining
        // onOpenChange(false) source is the vendored X control.
        if (!next) requestClose('x');
      }}
    >
      <DialogContent
        showCloseButton={!blocking}
        className={className}
        // Contract part `root` requires role=dialog AND aria-modal=true.
        // Radix Content already renders role=dialog and enforces modality via
        // FocusScope trap + outside inert, but @radix-ui/react-dialog@1.2 does
        // NOT emit the aria-modal attribute itself, so the composition sets it.
        aria-modal="true"
        // R1-DLG-02: Esc and overlay are ADDITIONAL entries; the reference
        // never lets them be the sole close mechanism, so disable both.
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="flex flex-col gap-4" data-testid="edit-dialog-fields">
          {fields.map((field) => {
            const fieldId = `edit-field-${field.name}`;
            return (
              <div key={field.name} className="flex flex-col gap-1.5">
                <label htmlFor={fieldId} className="text-sm font-medium">
                  {field.label}
                </label>
                <ShadcnTextInput
                  id={fieldId}
                  name={field.name}
                  type={field.type ?? 'text'}
                  autoComplete={field.autoComplete}
                  placeholder={field.placeholder}
                  description={field.description}
                  error={field.error}
                  value={values[field.name] ?? ''}
                  onValueChange={(next) => {
                    setValues((prev) => ({ ...prev, [field.name]: next }));
                    if (saveError) setSaveError(null);
                  }}
                />
              </div>
            );
          })}
        </div>

        {saveError ? (
          <p role="alert" className="text-destructive text-sm" data-testid="edit-dialog-save-error">
            {saveError}
            {saveExhausted ? `（重试已达上限 ${retryLimit} 次，请${conv.blocking.failureFallback.then}。）` : ''}
          </p>
        ) : null}

        {pendingCloseReason ? (
          <div
            role="alertdialog"
            aria-label="放弃待保存的更改？"
            data-testid="edit-dialog-pending-confirm"
            className="flex flex-col gap-2 rounded-md border p-3"
          >
            <p className="text-sm font-medium">请求尚未完成，确定要放弃并关闭吗？</p>
            <div className="flex justify-end gap-2">
              <ShadcnButton
                type="button"
                variant="outline"
                onClick={() => setPendingCloseReason(null)}
              >
                继续编辑
              </ShadcnButton>
              <ShadcnButton
                type="button"
                variant="destructive"
                onClick={() => closeWith('pending-confirm')}
              >
                放弃并关闭
              </ShadcnButton>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          {blocking ? (
            <ShadcnButton
              type="button"
              variant="destructive"
              onClick={() => requestClose('discard')}
              data-testid="edit-dialog-discard"
            >
              {conv.blocking.resolutionPath[1] ?? '放弃变更并关闭'}
            </ShadcnButton>
          ) : (
            <ShadcnButton
              type="button"
              variant={cancel as 'outline'}
              disabled={pendingCloseReason !== null}
              onClick={() => requestClose('cancel')}
              data-testid="edit-dialog-cancel"
            >
              取消
            </ShadcnButton>
          )}
          <ShadcnButton
            type="button"
            variant={primary as 'default'}
            loading={pending}
            disabled={saveExhausted}
            onClick={handleSave}
            data-testid="edit-dialog-save"
          >
            {saveExhausted
              ? '保存不可用'
              : pending
                ? '保存中…'
                : conv.blocking.resolutionPath[0] ?? '保存'}
          </ShadcnButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
