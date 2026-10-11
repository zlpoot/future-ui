/**
 * 成员管理后台测试 fixture（#109 首次实现后的同步修复）。
 *
 * 修复原因：create-future-ui 模板 fixture 针对模板 demo 页面（button-echo /
 * standalone-echo / edit-demo-1），App.tsx 替换为成员管理页后 4 个用例失败。
 * 本文件改为验证成员管理页的真实行为：统计卡、搜索过滤、新增/编辑预填、
 * 取消不保存、保存 pending 防重复并更新列表、Light/Dark。
 * 断言均基于实际渲染 DOM（jsdom），不替代人工 Chrome 验收。
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App.js';
import { useHostTheme } from './theme.js';

// vitest 未开 globals：显式清理每个测试的 DOM，避免元素跨用例累积。
afterEach(() => cleanup());

function HostProbe(): React.ReactElement {
  const { themeName, toggleTheme } = useHostTheme();
  return (
    <div>
      <button type="button" data-testid="probe-toggle" onClick={toggleTheme}>
        toggle
      </button>
      <span data-testid="probe-theme">{themeName}</span>
    </div>
  );
}

const renderApp = () =>
  render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

describe('成员管理后台 fixture', () => {
  it('初始渲染：6 名成员与统计卡片（总数 6 / 管理员 2 / 活跃 3 / 待邀请 2）', () => {
    renderApp();
    expect(screen.getByTestId('stat-total')).toHaveTextContent('6');
    expect(screen.getByTestId('stat-admins')).toHaveTextContent('2');
    expect(screen.getByTestId('stat-active')).toHaveTextContent('3');
    expect(screen.getByTestId('stat-invited')).toHaveTextContent('2');
    expect(screen.getByText('陈晨')).toBeInTheDocument();
    expect(screen.getByText('赵梦琪')).toBeInTheDocument();
  });

  it('搜索按姓名过滤；无匹配时显示空态', () => {
    renderApp();
    // ShadcnTextInput 契约：name 映射为 aria-label（组件不接受 aria-label prop）
    const search = screen.getByLabelText('member-search');
    fireEvent.change(search, { target: { value: '陈' } });
    expect(screen.getByText('陈晨')).toBeInTheDocument();
    expect(screen.queryByText('李一诺')).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: '不存在的成员xyz' } });
    expect(screen.getByTestId('empty-row')).toHaveTextContent('未找到匹配的成员');
  });

  it('新增成员：保存后列表与统计更新', async () => {
    renderApp();
    fireEvent.click(screen.getByTestId('open-create'));
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: '新成员甲' } });
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'new@example.local' } });
    fireEvent.click(screen.getByRole('button', { name: /保存/ }));
    // pending 中间态：保存按钮 disabled
    await waitFor(() => expect(screen.getByRole('button', { name: /保存/ })).toBeDisabled());
    // 完成后自动关闭并刷新列表与统计
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('新成员甲')).toBeInTheDocument();
    expect(screen.getByTestId('stat-total')).toHaveTextContent('7');
    expect(screen.getByTestId('save-toast')).toHaveTextContent('已新增成员：新成员甲');
  });

  it('编辑成员：打开即预填当前数据', async () => {
    renderApp();
    fireEvent.click(screen.getByTestId('edit-m-01'));
    await screen.findByRole('dialog');
    expect(screen.getByLabelText('姓名')).toHaveValue('陈晨');
    expect(screen.getByLabelText('邮箱')).toHaveValue('chenchen@example.local');
  });

  it('取消不保存：修改后取消，原数据保持不变', async () => {
    renderApp();
    fireEvent.click(screen.getByTestId('edit-m-01'));
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: '改名不保存' } });
    fireEvent.click(screen.getByRole('button', { name: /取消/ }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('陈晨')).toBeInTheDocument();
    expect(screen.queryByText('改名不保存')).not.toBeInTheDocument();
  });

  it('保存进入 pending 并阻止重复提交，完成后更新列表', async () => {
    renderApp();
    fireEvent.click(screen.getByTestId('edit-m-01'));
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: '陈晨（已更新）' } });
    fireEvent.click(screen.getByRole('button', { name: /保存/ }));
    // pending：保存按钮 disabled 且呈现"保存中"
    await waitFor(() => {
      const save = screen.getByRole('button', { name: /保存/ });
      expect(save).toBeDisabled();
    });
    // 重复点击被阻止（disabled 状态下 fireEvent.click 不触发第二次保存）
    const save = screen.getByRole('button', { name: /保存/ });
    fireEvent.click(save);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('陈晨（已更新）')).toBeInTheDocument();
    expect(screen.getByTestId('save-toast')).toHaveTextContent('已保存成员：陈晨');
  });

  it('Light/Dark 切换同步 data-theme 到 html', () => {
    render(
      <StrictMode>
        <HostProbe />
      </StrictMode>,
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    fireEvent.click(screen.getByTestId('probe-toggle'));
    expect(screen.getByTestId('probe-theme')).toHaveTextContent('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    fireEvent.click(screen.getByTestId('probe-toggle'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
