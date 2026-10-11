/**
 * 成员管理后台（首次 AI 实现 · #109）。
 *
 * 依据 AI-AGENTS.md 与 ai:view 的 Admin List 页面 recipe 组合：
 *  - 左侧 Sidebar 导航 + 右侧内容区（页面级组合约定，非通用 Sidebar 组件 Contract）
 *  - h1 页头 + 统计卡片（grid-cols-4）
 *  - 搜索用 ShadcnTextInput（id + aria-label）
 *  - 语义表格 table > thead(th[scope=col]) + tbody（非通用 Table Contract）
 *  - 新增/编辑统一走 EditDialog（预填；取消不保存；onSave async，pending 防重复由
 *    EditDialog 呈现并阻止重复提交，完成后自动关闭并刷新列表）
 *  - Light/Dark：@future-ui/theme/theme.css token 单一数据源 + <html data-theme> 切换
 * 所有组件从 @future-ui/shadcn-adapter/browser 导入（唯一合法入口）。
 */
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import {
  EditDialog,
  ShadcnButton,
  ShadcnTextInput,
  editDialogProfile,
} from '@future-ui/shadcn-adapter/browser';
import type { EditDialogOpenChangeDetail } from '@future-ui/shadcn-adapter/browser';
import { ThemeFloatToggle, useHostTheme } from './theme.js';
import { INITIAL_MEMBERS, computeStats, memberFields } from './members.js';
import type { Member, MemberInput } from './members.js';

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** 打开编辑框的目标：null 关闭；{ mode:'create' } 新增；{ mode:'edit', member } 编辑预填。 */
interface EditingTarget {
  mode: 'create' | 'edit';
  member: Member | null;
}

export function App(): ReactElement {
  const { themeName, toggleTheme } = useHostTheme();
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [search, setSearch] = useState('');
  const [saved, setSaved] = useState<string | null>(null);

  const stats = useMemo(() => computeStats(members), [members]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.status.toLowerCase().includes(q),
    );
  }, [members, search]);

  /** 业务保存 handler：新增 append、编辑原地更新；成功后由 EditDialog 自动关闭。 */
  const handleSave = async (values: Record<string, string>): Promise<void> => {
    const target = editing;
    if (!target) return;
    // 本地模拟保存耗时：pending 期间 EditDialog 呈现“保存中…”，阻止重复提交。
    await delay(600);
    const input: MemberInput = {
      name: (values.name ?? '').trim(),
      email: (values.email ?? '').trim(),
      role: (values.role ?? 'viewer').trim() as Member['role'],
      status: (values.status ?? 'active').trim() as Member['status'],
    };
    if (target.mode === 'create') {
      const member: Member = {
        id: `m-${Date.now().toString(36)}`,
        ...input,
        joinedAt: new Date().toISOString().slice(0, 10),
      };
      setMembers((prev) => [...prev, member]);
      setSaved(`已新增成员：${member.name}`);
    } else {
      const current = target.member;
      if (!current) return;
      setMembers((prev) =>
        prev.map((m) => (m.id === current.id ? { ...m, ...input } : m)),
      );
      setSaved(`已保存成员：${current.name}`);
    }
    setEditing(null);
  };

  const handleOpenChange = (detail: EditDialogOpenChangeDetail): void => {
    // 取消/关闭：不保存、不写入 store。
    if (!detail.open) setEditing(null);
  };

  const fields = editing ? memberFields(editing.member) : [];
  const dialogLabel = editing?.mode === 'create' ? '新增成员' : '编辑成员';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ThemeFloatToggle themeName={themeName} onToggle={toggleTheme} />

      <div className="flex min-h-screen">
        {/* 左侧导航（页面组合约定：语义 nav + ul，非通用 Sidebar 组件 Contract） */}
        <aside className="w-56 shrink-0 border-r border-border bg-surface">
          <nav aria-label="主导航" className="px-3 py-6">
            <p className="px-2 text-xs font-medium text-muted-foreground">Future UI 后台</p>
            <ul className="mt-3 space-y-1">
              <li>
                <a
                  href="#overview"
                  aria-current="page"
                  className="block rounded-md bg-primary/10 px-2 py-1.5 text-sm font-medium text-primary"
                >
                  成员管理
                </a>
              </li>
              <li>
                <a href="#overview" className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-surface-strong">
                  数据看板
                </a>
              </li>
              <li>
                <a href="#overview" className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-surface-strong">
                  系统设置
                </a>
              </li>
            </ul>
          </nav>
        </aside>

        {/* 右侧内容区 */}
        <main id="overview" className="min-w-0 flex-1 px-4 py-6">
          <div className="mx-auto max-w-7xl">
            {/* 页头 + 操作 */}
            <header className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">成员管理</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  本地模拟成员数据 · 不接后端/外部账户
                </p>
              </div>
              <ShadcnButton
                type="button"
                data-testid="open-create"
                onClick={() => setEditing({ mode: 'create', member: null })}
              >
                新增成员
              </ShadcnButton>
            </header>

            {saved ? (
              <p className="mt-4 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground" data-testid="save-toast">
                {saved}
              </p>
            ) : null}

            {/* 统计卡片 */}
            <section aria-label="成员统计" className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-sm text-muted-foreground">成员总数</p>
                <p className="mt-1 text-2xl font-semibold" data-testid="stat-total">{stats.total}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-sm text-muted-foreground">管理员</p>
                <p className="mt-1 text-2xl font-semibold" data-testid="stat-admins">{stats.admins}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-sm text-muted-foreground">活跃成员</p>
                <p className="mt-1 text-2xl font-semibold" data-testid="stat-active">{stats.active}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-sm text-muted-foreground">待邀请</p>
                <p className="mt-1 text-2xl font-semibold" data-testid="stat-invited">{stats.invited}</p>
              </div>
            </section>

            {/* 搜索 + 成员表格 */}
            <section aria-label="成员列表" className="mt-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-medium">成员列表</h2>
                <div className="w-full max-w-xs">
                  <ShadcnTextInput
                    id="member-search"
                    name="member-search"
                    placeholder="搜索成员…"
                    value={search}
                    onValueChange={(event) => setSearch(event.value)}
                  />
                </div>
              </div>

              <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-surface">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th scope="col" className="px-3 py-2 font-medium">姓名</th>
                      <th scope="col" className="px-3 py-2 font-medium">邮箱</th>
                      <th scope="col" className="px-3 py-2 font-medium">角色</th>
                      <th scope="col" className="px-3 py-2 font-medium">状态</th>
                      <th scope="col" className="px-3 py-2 font-medium">加入日期</th>
                      <th scope="col" className="px-3 py-2 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((member) => (
                      <tr key={member.id} className="border-b border-border last:border-b-0" data-testid={`row-${member.id}`}>
                        <td className="px-3 py-2 font-medium text-foreground">{member.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{member.email}</td>
                        <td className="px-3 py-2">{member.role}</td>
                        <td className="px-3 py-2">{member.status}</td>
                        <td className="px-3 py-2 text-muted-foreground">{member.joinedAt}</td>
                        <td className="px-3 py-2">
                          <ShadcnButton
                            type="button"
                            variant="outline"
                            size="sm"
                            data-testid={`edit-${member.id}`}
                            onClick={() => setEditing({ mode: 'edit', member })}
                          >
                            编辑
                          </ShadcnButton>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground" data-testid="empty-row">
                          未找到匹配的成员
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* 新增/编辑对话框：取消不保存；保存 pending 防重复由 EditDialog 呈现；成功后自动关闭 */}
      <EditDialog
        open={editing !== null}
        profile={editDialogProfile}
        label={dialogLabel}
        description={editing?.mode === 'create' ? '填写成员信息并保存' : '修改后保存；取消则放弃本次修改'}
        fields={fields}
        onSave={handleSave}
        onOpenChange={handleOpenChange}
      />
    </div>
  );
}
