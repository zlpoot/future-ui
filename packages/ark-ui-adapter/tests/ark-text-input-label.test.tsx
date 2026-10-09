// @vitest-environment jsdom
/**
 * R1-RC-001 (#86) · P2 定向回归测试 — Ark TextInput 标签关联。
 *
 * Owner 独立审查反馈：手工 Demo 的 <label htmlFor> 没有关联真实 Field.Input 的 id，
 * 点击标签无法聚焦输入框。修复方式（局部、不改公共 Contract）：ArkTextInput 增加
 * `id` 透传属性，host 层传入与 htmlFor 匹配的 id。
 *
 * jsdom 已知限制：fireEvent.click(label) 不会模拟浏览器的 label→control 焦点转移
 * （jsdom 的 label activation 只触发控件 click，不转移焦点）。因此本测试在 jsdom 层
 * 验证「可被浏览器聚焦的关联事实」：id 真实渲染、htmlFor 与 id 相等、input 是可聚焦
 * 焦点目标；真实浏览器上的 label 点击聚焦以 interaction-verified 证据另行记录。
 */
import './setup.js';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ArkTextInput } from '../src/index.js';

describe('ArkTextInput label association (P2 #86)', () => {
  it('renders the passed id on Field.Input', () => {
    render(<ArkTextInput id="member-name" name="member-name" />);
    const input = document.querySelector('#member-name') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.tagName).toBe('INPUT');
  });

  it('label htmlFor resolves to the real focusable Field.Input id', () => {
    render(
      <>
        <label htmlFor="member-note">备注：</label>
        <ArkTextInput id="member-note" name="member-note" />
      </>,
    );
    const label = document.querySelector('label[for="member-note"]') as HTMLLabelElement;
    const input = document.querySelector('#member-note') as HTMLInputElement;
    // Association fact: the host label targets the real rendered input id.
    expect(label).not.toBeNull();
    expect(label.htmlFor).toBe('member-note');
    expect(input).not.toBeNull();
    expect(input.id).toBe(label.htmlFor);
    // The input is the actual focus target a browser label click would move to.
    input.focus();
    expect(document.activeElement).toBe(input);
  });
});
