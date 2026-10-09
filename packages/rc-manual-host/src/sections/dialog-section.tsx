/**
 * Dialog comparison — real shadcn EditDialog vs real Ark Dialog.
 *
 * Both dialogs are host-owned controlled components. The shadcn column also
 * exposes the blocking variant (only save/discard can close) and logs close
 * reasons so the R1-DLG-02/05 behaviors are visible for manual acceptance.
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import { EditDialog, ShadcnButton } from '@future-ui/shadcn-adapter/browser';
import type { EditDialogOpenChangeDetail } from '@future-ui/shadcn-adapter/browser';
import { ArkDialog, ArkButton, ArkTextInput } from '@future-ui/ark-ui-adapter/browser';

const DELAY_MS = 1200;

export function DialogSection(): ReactElement {
  const [shadcnOpen, setShadcnOpen] = useState(false);
  const [shadcnBlocking, setShadcnBlocking] = useState(false);
  const [shadcnPending, setShadcnPending] = useState(false);
  const [shadcnLog, setShadcnLog] = useState<string[]>([]);
  const [arkOpen, setArkOpen] = useState(false);
  const [arkLog, setArkLog] = useState<string[]>([]);

  const logShadcn = (line: string): void => setShadcnLog((prev) => [...prev, line]);
  const logArk = (line: string): void => setArkLog((prev) => [...prev, line]);

  const handleShadcnOpenChange = (detail: EditDialogOpenChangeDetail): void => {
    logShadcn(`openChange reason=${detail.reason} open=${detail.open}`);
    setShadcnOpen(detail.open);
  };

  return (
    <section className="section" data-testid="section-dialog">
      <h2>1 · Dialog 对照</h2>
      <p className="section-note">
        左侧：shadcn EditDialog（Radix，参考实例，含 blocking 变体）；右侧：Ark Dialog
        （@ark-ui/react@5.39.3 真实 primitive + opt-in CloseTrigger）。focus trap / Escape / 焦点归还需在真实浏览器验证。
      </p>
      <div className="columns">
        <div className="card">
          <h3>shadcn · EditDialog</h3>
          <p className="card-note">保存为 1.2s 异步（可观察 pending / R1-DLG-04 防重复提交）。</p>
          <div className="row">
            <ShadcnButton type="button" onClick={() => setShadcnOpen(true)}>
              打开编辑对话框
            </ShadcnButton>
            <ShadcnButton type="button" variant="outline" onClick={() => setShadcnBlocking((v) => !v)}>
              {shadcnBlocking ? 'blocking: 开 → 切为非 blocking' : 'blocking: 关 → 切为 blocking'}
            </ShadcnButton>
          </div>
          <p className="kv">
            <b>blocking 变体：</b>
            {shadcnBlocking ? '启用（仅 保存/放弃 可终结，Esc/遮罩不可关）' : '未启用'}
          </p>
          <EditDialog
            open={shadcnOpen}
            blocking={shadcnBlocking}
            label="编辑成员"
            description="维护成员资料（名称 / 备注）"
            fields={[
              { name: 'displayName', label: '名称', type: 'text', defaultValue: '' },
              { name: 'note', label: '备注', type: 'text', description: '仅内部可见' },
            ]}
            onSave={async (values) => {
              setShadcnPending(true);
              await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
              setShadcnPending(false);
              logShadcn(`save values=${JSON.stringify(values)}`);
            }}
            onOpenChange={handleShadcnOpenChange}
          />
          <div className="row">
            <span className="badge">R1-DLG-02 关闭入口</span>
            <span className="badge">R1-DLG-04 防重提交</span>
            <span className="badge">R1-DLG-05 pending 确认</span>
          </div>
          <pre className="log" data-testid="shadcn-dialog-log">
            {shadcnPending ? '[save pending…]\n' : ''}
            {shadcnLog.join('\n') || '(尚无关闭事件)'}
          </pre>
        </div>

        <div className="card">
          <h3>Ark · Dialog</h3>
          <p className="card-note">
            Dialog.Root / Positioner / Content / Title / Description + Dialog.CloseTrigger
            （真实 zag 机器：Escape、focus trap、焦点归还）。
          </p>
          <div className="row">
            <ArkButton type="button" onClick={() => setArkOpen(true)}>
              打开 Ark 对话框
            </ArkButton>
          </div>
          <ArkDialog
            open={arkOpen}
            label="Ark 示例对话框"
            description="Escape 与 关闭 按钮均可关闭（非 blocking）"
            closeLabel="关闭"
            onOpenChange={(e) => {
              logArk(`openChange open=${e.open}`);
              setArkOpen(e.open);
            }}
          >
            <p className="kv">内容区：</p>
            <ArkTextInput name="ark-note" placeholder="输入一些内容…" />
          </ArkDialog>
          <div className="row">
            <span className="badge yellow">supported（语义）</span>
            <span className="badge red">token unsupported（headless）</span>
          </div>
          <pre className="log" data-testid="ark-dialog-log">
            {arkLog.join('\n') || '(尚无关闭事件)'}
          </pre>
        </div>
      </div>
    </section>
  );
}
