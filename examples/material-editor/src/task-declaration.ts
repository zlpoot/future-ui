/**
 * R2-A4 (#102) · 任务管理与编辑（页面 B）同源业务声明 —— 与素材页（A）业务独立。
 *
 * 复用 example 级共享配方：
 *   - 同一字段声明结构（MaterialFieldDecl）与派生函数（toEditDialogFields /
 *     publicFieldMetadata），不复制第二套字段工具；
 *   - 同一 `r1-edit-dialog-reference` Profile / shadcn Adapter / Light-Dark 主题。
 *
 * 业务字段与素材页实质不同（任务名称 / 负责人 / 状态 / 内部备注），列表组成
 * 独立；internalNote 为敏感字段：UI 可编辑，但绝不进入 Agent 投影。
 * 本文件零依赖（仅类型/函数复用），浏览器图与 Node 图均可安全导入。
 */
import type { MaterialFieldDecl } from './material-declaration.js';
import { toEditDialogFields, publicFieldMetadata } from './material-declaration.js';

/** 任务字段声明（同一声明结构；键/标签/顺序/Action ref 均为任务业务）。 */
export type TaskFieldDecl = MaterialFieldDecl;

export const TASK_FIELDS: readonly TaskFieldDecl[] = [
  { name: 'taskName', label: '任务名称', initial: '', order: 1, actionRef: 'task/manage#name' },
  { name: 'owner', label: '负责人', initial: '', order: 2, actionRef: 'task/manage#owner' },
  { name: 'status', label: '状态', initial: '', order: 3, actionRef: 'task/manage#status' },
  { name: 'internalNote', label: '内部备注', initial: '', order: 4, actionRef: 'task/manage#internal-note', sensitive: true },
];

/** 页面/路由 scope（注册与 coverage 的单位；与素材页不同业务）。 */
export const TASK_SCOPE = 'task/manage';
/** 任务编辑 Dialog 实例 id。 */
export const TASK_DIALOG_INSTANCE_ID = 'task/manage-dialog';

/** 任务保存 Action 引用（与 UI 提交行为标识同源；不创建可执行 Agent tool）。 */
export const TASK_SAVE_ACTION: { ref: string; label: string } = {
  ref: 'task/manage#save',
  label: '保存并关闭',
};

/** 任务行：本地虚拟业务数据（仅试用；internalNote 不进入任何 Agent 投影）。 */
export interface TaskRow {
  id: string;
  values: Record<string, string>;
}

export const VIRTUAL_TASKS: readonly TaskRow[] = [
  {
    id: 't1',
    values: { taskName: '季度素材盘点', owner: '李芳', status: '进行中', internalNote: '需在周五前输出清单' },
  },
  {
    id: 't2',
    values: { taskName: '官网改版走查', owner: '王超', status: '待评审', internalNote: '等待设计终稿' },
  },
  {
    id: 't3',
    values: { taskName: '年会视频粗剪', owner: '陈曦', status: '已完成', internalNote: '成片已交付' },
  },
];

export { toEditDialogFields, publicFieldMetadata };
