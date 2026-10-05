/**
 * d10-harness · canonical render.js — 组中立参考渲染（starter 与 evaluator 共用同一份逻辑）。
 *
 * 契约语义（供任务文本引用，任务文本会显式写出所需语义）：
 * - spec 结构：{ components: [ { id, type, label?, props } ] }
 *   - label：组件级展示文本（如按钮文字），**不是契约 prop**（button 契约只声明
 *     disabled/loading/type；契约校验只校验 props，label 不进 props）。
 * - button: props { disabled, loading, type('button'|'submit'|'reset', 默认 'button') }
 *   - 展示文本取组件级 label；loading === true → disabled=true 且 aria-busy="true"
 *     （loading 隐含 disabled，阻止激活）
 * - select:  props { options:[{label,value}], defaultValue, placeholder, disabled }
 *   - options 渲染为 <option value=…>label</option>；placeholder 非空时前置一个空值 option；
 *   - defaultValue 仅当与某个 option 的 value 精确匹配时才应用（否则保持空/占位）；
 *   - disabled === true → 不产生 change 事件（事件不投递）。
 * - textinput: props { value, defaultValue, disabled, readOnly, error, name, description, placeholder, type }
 *   - <input data-part="root">；error → aria-invalid="true"；name → aria-label（契约可访问性映射）。
 *
 * 事件为原生 DOM 事件（click/change/input）；消费者可自行 addEventListener。
 * 路径约定：/button[i] /select[i] /select[i]/option[j] /input[i]。
 * 本文件不可被模型修改（evaluator 使用本文件的独立副本，workspace 内改动无效）。
 */

export function render(spec, container) {
  container.innerHTML = '';
  const components = spec && Array.isArray(spec.components) ? spec.components : [];
  for (const comp of components) {
    const props = comp.props || {};
    if (comp.type === 'button') {
      const button = document.createElement('button');
      button.setAttribute('data-part', 'root');
      button.type = props.type === 'submit' || props.type === 'reset' ? props.type : 'button';
      button.textContent = typeof comp.label === 'string' ? comp.label : '';
      if (props.disabled === true) button.disabled = true;
      if (props.loading === true) {
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
      }
      container.appendChild(button);
    } else if (comp.type === 'select') {
      const select = document.createElement('select');
      select.setAttribute('data-part', 'root');
      const options = Array.isArray(props.options) ? props.options : [];
      if (typeof props.placeholder === 'string' && props.placeholder !== '') {
        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = props.placeholder;
        select.appendChild(empty);
      }
      for (const opt of options) {
        if (!opt || typeof opt.value !== 'string' || typeof opt.label !== 'string') continue;
        const el = document.createElement('option');
        el.value = opt.value;
        el.textContent = opt.label;
        select.appendChild(el);
      }
      if (typeof props.defaultValue === 'string' && options.some((o) => o && o.value === props.defaultValue)) {
        select.value = props.defaultValue;
      }
      if (props.disabled === true) select.disabled = true;
      container.appendChild(select);
    } else if (comp.type === 'textinput') {
      const input = document.createElement('input');
      input.setAttribute('data-part', 'root');
      if (typeof props.value === 'string') input.value = props.value;
      else if (typeof props.defaultValue === 'string') input.value = props.defaultValue;
      if (typeof props.placeholder === 'string') input.placeholder = props.placeholder;
      if (props.disabled === true) input.disabled = true;
      if (props.readOnly === true) input.readOnly = true;
      if (props.error === true) input.setAttribute('aria-invalid', 'true');
      if (typeof props.name === 'string' && props.name !== '') input.setAttribute('aria-label', props.name);
      container.appendChild(input);
    }
  }
}
