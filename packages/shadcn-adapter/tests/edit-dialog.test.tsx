// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import './setup.js';
import * as React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EditDialog } from '../src/index.js';
import type { EditDialogField, EditDialogOpenChangeDetail } from '../src/index.js';
import { ShadcnButton } from '../src/index.js';
import { ShadcnTextInput } from '../src/index.js';

const fields: EditDialogField[] = [
  { name: 'name', label: '名称', defaultValue: 'Alice', autoComplete: 'off' },
  { name: 'email', label: '邮箱', type: 'email', defaultValue: 'a@example.com' },
];

function Harness(props: {
  open?: boolean;
  onSave?: (values: Record<string, string>) => Promise<void> | void;
  onOpenChange?: (d: EditDialogOpenChangeDetail) => void;
  blocking?: boolean;
  description?: string;
}) {
  const [open, setOpen] = React.useState(props.open ?? true);
  return (
    <EditDialog
      open={open}
      label="编辑成员"
      description={props.description ?? '修改成员信息'}
      fields={fields}
      blocking={props.blocking}
      onSave={props.onSave ?? (() => {})}
      onOpenChange={(d) => {
        props.onOpenChange?.(d);
        setOpen(d.open);
      }}
    />
  );
}

describe('D17 EditDialog reference', () => {
  it('renders role=dialog with aria-modal and label as accessible name (R1-DLG-01)', async () => {
    render(<Harness />);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(await screen.findByRole('heading', { name: '编辑成员' })).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(within(dialog).getByText('修改成员信息')).toBeInTheDocument();
  });

  it('cancel emits reason "cancel" and closes', async () => {
    const onOpenChange = vi.fn();
    render(<Harness onOpenChange={onOpenChange} />);
    fireEvent.click(await screen.findByTestId('edit-dialog-cancel'));
    expect(onOpenChange).toHaveBeenCalledWith({ open: false, reason: 'cancel' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('save passes field values then closes with reason "save"', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    render(<Harness onSave={onSave} onOpenChange={onOpenChange} />);
    const nameInput = screen.getByDisplayValue('Alice');
    fireEvent.change(nameInput, { target: { value: 'Bob' } });
    fireEvent.click(screen.getByTestId('edit-dialog-save'));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({ name: 'Bob', email: 'a@example.com' });
    await waitFor(() =>
      expect(onOpenChange).toHaveBeenCalledWith({ open: false, reason: 'save' }),
    );
  });

  it('blocks resubmit while pending (R1-DLG-04): onSave called only once', async () => {
    let resolveSave: () => void = () => {};
    const onSave = vi.fn(
      () => new Promise<void>((resolve) => { resolveSave = resolve; }),
    );
    render(<Harness onSave={onSave} />);
    const saveBtn = screen.getByTestId('edit-dialog-save');
    fireEvent.click(saveBtn);
    fireEvent.click(saveBtn);
    fireEvent.click(saveBtn);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(saveBtn).toBeDisabled();
    expect(saveBtn).toHaveAttribute('aria-busy', 'true');
    resolveSave!();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('Escape and overlay click are disabled (R1-DLG-02): dialog stays open', async () => {
    render(<Harness />);
    const dialog = await screen.findByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    fireEvent.pointerDown(document.body);
    // allow any async dismissal to settle
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('a close request while pending opens an explicit confirm, never silent close (R1-DLG-05)', async () => {
    let resolveSave: () => void = () => {};
    const onSave = vi.fn(() => new Promise<void>((resolve) => { resolveSave = resolve; }));
    const onOpenChange = vi.fn();
    render(<Harness onSave={onSave} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByTestId('edit-dialog-save'));
    // request cancel while pending
    fireEvent.click(screen.getByTestId('edit-dialog-cancel'));
    const confirm = await screen.findByTestId('edit-dialog-pending-confirm');
    expect(confirm).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(within(confirm).getByRole('button', { name: '继续等待' }));
    expect(screen.queryByTestId('edit-dialog-pending-confirm')).not.toBeInTheDocument();
    // request again and confirm stop-waiting
    fireEvent.click(screen.getByTestId('edit-dialog-cancel'));
    fireEvent.click(await within(await screen.findByTestId('edit-dialog-pending-confirm')).findByRole('button', { name: '停止等待并关闭' }));
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith({ open: false, reason: 'pending-confirm' });
    // The in-flight save eventually succeeds: it must NOT fire a second close.
    await act(async () => {
      resolveSave!();
      await Promise.resolve();
    });
    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });

  it('an in-flight save that rejects after stop-waiting emits no second close or error (R1-DLG-05)', async () => {
    let rejectSave: (e: unknown) => void = () => {};
    const onSave = vi.fn(() => new Promise<void>((_resolve, reject) => { rejectSave = reject; }));
    const onOpenChange = vi.fn();
    render(<Harness onSave={onSave} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByTestId('edit-dialog-save'));
    fireEvent.click(screen.getByTestId('edit-dialog-cancel'));
    fireEvent.click(await within(await screen.findByTestId('edit-dialog-pending-confirm')).findByRole('button', { name: '停止等待并关闭' }));
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    await act(async () => {
      rejectSave!(new Error('late failure'));
      await Promise.resolve();
    });
    // No second close notification surfaces from the late rejection.
    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });

  it('blocking variant removes ordinary cancel and X, exposes finite resolution paths (R1-DLG-08/EX-BLK-001)', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    render(<Harness blocking onSave={onSave} onOpenChange={onOpenChange} />);
    await screen.findByRole('dialog');
    expect(screen.queryByTestId('edit-dialog-cancel')).not.toBeInTheDocument();
    // The vendored X is suppressed via showCloseButton=false.
    expect(document.querySelector('[data-slot="dialog-close"]')).toBeNull();
    const discard = screen.getByTestId('edit-dialog-discard');
    fireEvent.click(discard);
    // Discard is a direct resolution path.
    expect(onOpenChange).toHaveBeenCalledWith({ open: false, reason: 'discard' });
  });

  it('save failure retry limit then forces discard fallback (R1-DLG-08)', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('network down'));
    const onOpenChange = vi.fn();
    render(<Harness blocking onSave={onSave} onOpenChange={onOpenChange} />);
    const saveBtn = screen.getByTestId('edit-dialog-save');
    for (let i = 0; i < 3; i += 1) {
      fireEvent.click(saveBtn);
      await screen.findByTestId('edit-dialog-save-error');
    }
    expect(onSave).toHaveBeenCalledTimes(3); // 1 initial + retryLimit 2
    await waitFor(() => expect(saveBtn).toBeDisabled());
    expect(screen.getByTestId('edit-dialog-discard')).toBeInTheDocument();
    expect(screen.getByTestId('edit-dialog-save-error').textContent).toContain('放弃变更并关闭');
  });

  it('wires field error to aria-invalid and description to aria-describedby', async () => {
    const errorFields: EditDialogField[] = [{ name: 'name', label: '名称', defaultValue: 'x', error: true, description: '必填' }];
    render(
      <EditDialog open label="t" fields={errorFields} onSave={() => {}} onOpenChange={() => {}} />,
    );
    const input = screen.getByDisplayValue('x');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toBeTruthy();
    expect(screen.getByText('必填')).toBeInTheDocument();
  });
});

describe('ShadcnButton composition', () => {
  it('forces type=button by default and does not fire click while loading', () => {
    const onClick = vi.fn();
    const { rerender } = render(<ShadcnButton onClick={onClick}>ok</ShadcnButton>);
    const btn = screen.getByRole('button', { name: 'ok' });
    expect(btn).toHaveAttribute('type', 'button');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<ShadcnButton loading onClick={onClick}>ok</ShadcnButton>);
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toBeDisabled();
  });
});

describe('ShadcnTextInput composition', () => {
  it('emits valueChange payload { value } and sets aria-invalid', () => {
    const onValueChange = vi.fn();
    render(<ShadcnTextInput defaultValue="a" error onValueChange={onValueChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith({ value: 'abc' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not emit valueChange when readOnly', () => {
    const onValueChange = vi.fn();
    render(<ShadcnTextInput readOnly defaultValue="a" onValueChange={onValueChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'abc' } });
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('maps name to both the native name attribute and aria-label (contract accessibility clause)', () => {
    render(<ShadcnTextInput defaultValue="" name="email" />);
    const input = document.querySelector('input[name="email"]');
    expect(input).not.toBeNull();
    expect(input).toHaveAttribute('aria-label', 'email');
  });

  it('native implicit role follows the input type (textbox set vs number/search/password)', () => {
    const textboxTypes = ['text', 'email', 'tel', 'url'] as const;
    for (const type of textboxTypes) {
      const { unmount } = render(<ShadcnTextInput type={type} defaultValue="" />);
      expect(screen.queryByRole('textbox'), type).not.toBeNull();
      expect(screen.queryByRole('spinbutton'), type).toBeNull();
      expect(screen.queryByRole('searchbox'), type).toBeNull();
      unmount();
    }

    const { unmount: unmountNumber } = render(<ShadcnTextInput type="number" defaultValue="" />);
    expect(screen.queryByRole('spinbutton')).not.toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    unmountNumber();

    const { unmount: unmountSearch } = render(<ShadcnTextInput type="search" defaultValue="" />);
    expect(screen.queryByRole('searchbox')).not.toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    unmountSearch();

    // password has no corresponding implicit ARIA role.
    const { unmount: unmountPassword } = render(<ShadcnTextInput type="password" defaultValue="" />);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.queryByRole('searchbox')).toBeNull();
    unmountPassword();
  });
});
