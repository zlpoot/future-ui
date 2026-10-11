/**
 * 模板自带测试 fixture（不预置完整管理页）：
 * 验证现有 ShadcnButton / ShadcnTextInput / EditDialog 的预填、取消、保存
 * pending 与 Light/Dark 主题切换。仅依赖本模板依赖的测试栈。
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

describe('create-future-ui 模板 fixture', () => {
  it('ShadcnButton 默认按钮可点击并反映状态', () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    expect(screen.getByTestId('button-echo')).toHaveTextContent('未点击');
    fireEvent.click(screen.getByTestId('button-default'));
    expect(screen.getByTestId('button-echo')).toHaveTextContent('已点击');
  });

  it('ShadcnTextInput 受控输入同步回显', () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    const input = screen.getByPlaceholderText('输入内容…');
    fireEvent.change(input, { target: { value: 'hello' } });
    expect(screen.getByTestId('standalone-echo')).toHaveTextContent('hello');
  });

  it('EditDialog 打开即预填，取消不保存', async () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    fireEvent.click(screen.getByTestId('edit-demo-1'));
    // Radix Dialog 渲染到 body Portal：等待对话框出现
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    const titleInput = screen.getByLabelText('标题') as HTMLInputElement;
    expect(titleInput.value).toBe('示例任务');

    fireEvent.click(screen.getByRole('button', { name: /取消/ }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('示例任务')).toBeInTheDocument();
  });

  it('EditDialog 保存进入 pending 后关闭并更新列表', async () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    fireEvent.click(screen.getByTestId('edit-demo-1'));
    await screen.findByRole('dialog');
    const titleInput = screen.getByLabelText('标题') as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: '已编辑的标题' } });

    fireEvent.click(screen.getByRole('button', { name: /保存/ }));
    // pending 中间态：保存按钮 disabled 且呈现"保存中"
    await waitFor(() => {
      const save = screen.getByRole('button', { name: /保存/ });
      expect(save).toBeDisabled();
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('已编辑的标题')).toBeInTheDocument();
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
