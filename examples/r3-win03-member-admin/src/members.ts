/**
 * 本地模拟成员数据与业务 store（成员管理后台 · #109 首次 AI 实现）。
 *
 * 规范来源：AI-AGENTS.md + ai:view（r1-edit-dialog-reference@1.0.0；组件一律走
 * @future-ui/shadcn-adapter/browser）。本文件只持有本地内存数据与保存 handler，
 * 不接后端/外部账户；业务保存由应用层 handler 持有（AGENTS.md）。
 */
export type MemberRole = 'admin' | 'editor' | 'viewer';
export type MemberStatus = 'active' | 'invited' | 'disabled';

export interface Member {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  status: MemberStatus;
  joinedAt: string; // ISO date string，仅本地模拟
}

export const INITIAL_MEMBERS: Member[] = [
  { id: 'm-01', name: '陈晨', email: 'chenchen@example.local', role: 'admin', status: 'active', joinedAt: '2026-01-12' },
  { id: 'm-02', name: '李一诺', email: 'liyinuo@example.local', role: 'editor', status: 'active', joinedAt: '2026-02-03' },
  { id: 'm-03', name: '王梓涵', email: 'wangzihan@example.local', role: 'viewer', status: 'invited', joinedAt: '2026-03-15' },
  { id: 'm-04', name: '张欣然', email: 'zhangxinran@example.local', role: 'editor', status: 'active', joinedAt: '2026-04-22' },
  { id: 'm-05', name: '刘思远', email: 'liusiyuan@example.local', role: 'viewer', status: 'disabled', joinedAt: '2026-05-08' },
  { id: 'm-06', name: '赵梦琪', email: 'zhaomengqi@example.local', role: 'admin', status: 'invited', joinedAt: '2026-06-30' },
];

export type MemberInput = Pick<Member, 'name' | 'email' | 'role' | 'status'>;

/** 由保存 handler 根据编辑目标派生的表单字段（新增为空、编辑预填行数据）。 */
export function memberFields(member: Member | null): { name: string; label: string; value: string; placeholder: string }[] {
  return [
    { name: 'name', label: '姓名', value: member?.name ?? '', placeholder: '输入成员姓名' },
    { name: 'email', label: '邮箱', value: member?.email ?? '', placeholder: 'name@example.local' },
    { name: 'role', label: '角色', value: member?.role ?? 'viewer', placeholder: 'admin / editor / viewer' },
    { name: 'status', label: '状态', value: member?.status ?? 'active', placeholder: 'active / invited / disabled' },
  ];
}

/** 统计口径（本地模拟）：总数、管理员数、活跃数、待邀请数。 */
export interface MemberStats {
  total: number;
  admins: number;
  active: number;
  invited: number;
}

export function computeStats(members: Member[]): MemberStats {
  return {
    total: members.length,
    admins: members.filter((m) => m.role === 'admin').length,
    active: members.filter((m) => m.status === 'active').length,
    invited: members.filter((m) => m.status === 'invited').length,
  };
}
