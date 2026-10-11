/**
 * create-future-ui 模板 · 最小启动入口（不预置管理页面）。
 * 本地演示数据仅驻留内存，不落盘；不导入任何 Node-only 模块。
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import {
  EditDialog,
  ShadcnButton,
  ShadcnTextInput,
  editDialogProfile,
} from '@future-ui/shadcn-adapter/browser';
import type { EditDialogOpenChangeDetail } from '@future-ui/shadcn-adapter/browser';
import { ThemeFloatToggle, useHostTheme } from './theme.js';

interface Item {
  id: string;
  title: string;
  description: string;
}

const INITIAL_ITEMS: Item[] = [
  { id: 'demo-1', title: '示例任务', description: '本地演示数据，等待编辑' },
];

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export function App(): ReactElement {
  const { themeName, toggleTheme } = useHostTheme();
  const [items, setItems] = useState<Item[]>(INITIAL_ITEMS);
  const [editing, setEditing] = useState<Item | null>(null);
  const [standalone, setStandalone] = useState('');
  const [clicked, setClicked] = useState(false);

  const fields = editing
    ? [
        { name: 'title', label: '标题', value: editing.title },
        { name: 'description', label: '描述', value: editing.description },
      ]
    : [];

  const handleSave = async (values: Record<string, string>): Promise<void> => {
    const target = editing;
    if (!target) return;
    // pending 中间态由 EditDialog 呈现（保存中… + 阻止重复提交），完成后自动关闭。
    await delay(500);
    setItems((prev) =>
      prev.map((item) =>
        item.id === target.id
          ? {
              ...item,
              title: values.title ?? item.title,
              description: values.description ?? item.description,
            }
          : item,
      ),
    );
  };

  const handleOpenChange = (detail: EditDialogOpenChangeDetail): void => {
    if (!detail.open) setEditing(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ThemeFloatToggle themeName={themeName} onToggle={toggleTheme} />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Future UI 全新工程</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          create-future-ui 模板 · React 19 + Vite + TypeScript + Tailwind CSS v4 + shadcn/Radix
        </p>

        <section className="mt-8 rounded-lg border border-border bg-surface p-4" data-testid="button-section">
          <h2 className="text-sm font-medium">ShadcnButton</h2>
          <div className="mt-3 flex gap-2">
            <ShadcnButton type="button" data-testid="button-default" onClick={() => setClicked(true)}>
              默认按钮
            </ShadcnButton>
            <ShadcnButton type="button" variant="outline" data-testid="button-outline">
              描边按钮
            </ShadcnButton>
          </div>
          <p className="mt-2 text-xs text-muted-foreground" data-testid="button-echo">
            {clicked ? '默认按钮已点击' : '默认按钮未点击'}
          </p>
        </section>

        <section className="mt-4 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-medium">ShadcnTextInput（独立输入状态验证）</h2>
          <div className="mt-3">
            <ShadcnTextInput
              id="standalone-input"
              placeholder="输入内容…"
              value={standalone}
              onValueChange={(event) => setStandalone(event.value)}
              className="w-full"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground" data-testid="standalone-echo">
            已输入：{standalone || '（空）'}
          </p>
        </section>

        <section className="mt-4 rounded-lg border border-border bg-surface p-4" data-testid="item-list">
          <h2 className="text-sm font-medium">本地列表（无预置管理页）</h2>
          <ul className="mt-3 divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <ShadcnButton
                  type="button"
                  variant="outline"
                  size="sm"
                  data-testid={`edit-${item.id}`}
                  onClick={() => setEditing(item)}
                >
                  编辑
                </ShadcnButton>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">仅本地内存演示数据，不落盘。</p>
        </section>

        <EditDialog
          open={editing !== null}
          profile={editDialogProfile}
          label="编辑条目"
          description="预填、取消不保存；保存进入 pending 后自动关闭并更新列表"
          fields={fields}
          onSave={handleSave}
          onOpenChange={handleOpenChange}
        />
      </main>
    </div>
  );
}
