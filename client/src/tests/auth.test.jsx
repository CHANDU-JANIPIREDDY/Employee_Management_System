import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { AuthProvider } from '../context/AuthContext';
import { GuestRoute, ProtectedRoute } from '../routes/guards';
import { authService } from '../services';

vi.mock('../services', () => ({
  authService: {
    login: vi.fn(),
    me: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
  },
}));

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/" element={<ProtectedRoute><div>Dashboard home</div></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('login and route protection', () => {
  it('shows validation messages when the form is empty', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByTestId('login-submit'));
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });

  it('signs in and opens the dashboard', async () => {
    authService.login.mockResolvedValue({
      data: { token: 'token', user: { id: '1', name: 'System Admin', role: 'ADMIN', email: 'admin@smartsystem.com' } },
    });
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByTestId('login-email'), 'admin@smartsystem.com');
    await user.type(screen.getByTestId('login-password'), 'Admin@123');
    await user.click(screen.getByTestId('login-submit'));
    expect(await screen.findByText('Dashboard home')).toBeInTheDocument();
  });

  it('shows an error when credentials are rejected', async () => {
    authService.login.mockRejectedValue({ response: { data: { message: 'Invalid email or password' } } });
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByTestId('login-email'), 'admin@smartsystem.com');
    await user.type(screen.getByTestId('login-password'), 'wrong-pass');
    await user.click(screen.getByTestId('login-submit'));
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });

  it('redirects anonymous visitors away from protected pages', async () => {
    render(
      <MemoryRouter initialEntries={['/employees']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>Login screen</div>} />
            <Route path="/employees" element={<ProtectedRoute><div>Secret</div></ProtectedRoute>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Login screen')).toBeInTheDocument();
  });
});
