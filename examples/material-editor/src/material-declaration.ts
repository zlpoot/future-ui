/**
 * R2-A1 (#96) · 素材编辑同源声明 —— 唯一字段表。
 *
 * 同一份 TypeScript 声明同时驱动：
 *   1) React UI（虚拟列表 + 编辑 Dialog，字段键/标签/顺序/初始值一致）；
 *   2) dev-only Agent 只读投影（显式 allowlist 字段元数据 + Action 引用，非可执行描述）。
 *
 * 不复制第二套字段表；敏感字段（secretNote）允许 UI 编辑但绝不进入 Agent 投影。
 * 本文件零依赖，浏览器图与 Node 图均可安全导入。
 */

/** 素材字段声明（同一数据源，UI 与 Agent 投影均由此派生）。 */
export interface MaterialFieldDecl {
  /** 表单键：EditDialog 字段 name 与保存值 Record 的键。 */
  name: string;
  /** 可见标签：UI label 与投影中的字段标签。 */
  label: string;
  /** 初始值（打开弹窗时的受控种子）。 */
  initial: string;
  /** 字段顺序（UI 与投影保持一致）。 */
  order: number;
  /** Action 引用（非可执行描述），如 'material/edit#save'。 */
  actionRef: string;
  /** 敏感字段：UI 可编辑，但绝不注册/投影到 Agent 侧。 */
  sensitive?: boolean;
}

/** 素材编辑页的字段声明（唯一字段表；secretNote 为敏感字段）。 */
export const MATERIAL_FIELDS: readonly MaterialFieldDecl[] = [
  { name: 'displayName', label: '素材名称', initial: '', order: 1, actionRef: 'material/edit#name' },
  { name: 'description', label: '描述', initial: '', order: 2, actionRef: 'material/edit#description' },
  { name: 'secretNote', label: '内部版权备注', initial: '', order: 3, actionRef: 'material/edit#secret-note', sensitive: true },
];

/** 页面/路由 scope（注册与 coverage 的单位）。 */
export const MATERIAL_SCOPE = 'material/edit';
/** 素材编辑 Dialog 实例 id。 */
export const DIALOG_INSTANCE_ID = 'material/edit-dialog';

/** 素材行：虚拟业务数据（仅试用，值永不进入 Agent 投影）。 */
export interface MaterialRow {
  id: string;
  values: Record<string, string>;
}

export const VIRTUAL_MATERIALS: readonly MaterialRow[] = [
  {
    id: 'm1',
    values: { displayName: '春日山景.mp4', description: '8K 航拍镜头，10 秒', secretNote: '版权归属：自摄' },
  },
  {
    id: 'm2',
    values: { displayName: '城市夜景延时.mov', description: '4K 延时摄影，30 秒', secretNote: '版权归属：外包素材' },
  },
  {
    id: 'm3',
    values: { displayName: '产品特写.png', description: '白底静物图，透明通道', secretNote: '版权归属：客户授权' },
  },
];

/** 由声明派生 EditDialog 字段（UI 侧；与投影同源）。 */
export function toEditDialogFields(
  fields: readonly MaterialFieldDecl[],
  values: Record<string, string>,
): Array<{ name: string; label: string; type: 'text'; value: string; placeholder?: string }> {
  return fields.map((f) => ({ name: f.name, label: f.label, type: 'text' as const, value: values[f.name] ?? f.initial }));
}

/** 由声明派生 Agent 可公开字段元数据（窄 allowlist；敏感字段被过滤）。 */
export function publicFieldMetadata(fields: readonly MaterialFieldDecl[]): Array<{
  name: string;
  label: string;
  order: number;
  actionRef: string;
}> {
  return fields
    .filter((f) => f.sensitive !== true)
    .map((f) => ({ name: f.name, label: f.label, order: f.order, actionRef: f.actionRef }));
}
