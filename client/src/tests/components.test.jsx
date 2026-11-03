import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook, act } from '@testing-library/react';
import { EmployeeTable } from '../components/employees/EmployeeTable';
import { AttendanceActions } from '../components/attendance/AttendanceActions';
import { LeaveActions } from '../components/leaves/LeaveActions';
import { Pagination } from '../components/common/Pagination';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { KpiGrid } from '../components/common/KpiCard';
import { TableSkeleton } from '../components/common/Skeleton';
import { useDebounce } from '../hooks/useDebounce';
import { createEmployeeSchema, leaveSchema } from '../validations/schemas';
import { formatHours } from '../utils/format';

const employee = {
  id: '1',
  fullName: 'Riya Sharma',
  employeeId: 'EMP-0001',
  email: 'employee@smartsystem.com',
  department: { name: 'Engineering' },
  designation: 'Software Engineer',
  employmentStatus: 'active',
  joiningDate: '2023-06-12',
};

describe('employee directory pieces', () => {
  it('renders employee rows and an empty state', async () => {
    const onView = vi.fn();
    const { rerender } = render(<EmployeeTable rows={[employee]} onView={onView} onEdit={vi.fn()} onDeactivate={vi.fn()} />);
    expect(screen.getByText('Riya Sharma')).toBeInTheDocument();
    expect(screen.getByText(/EMP-0001/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'View' }));
    expect(onView).toHaveBeenCalledWith(employee);
    rerender(<EmployeeTable rows={[]} onView={vi.fn()} onEdit={vi.fn()} onDeactivate={vi.fn()} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('validates the employee form schema', () => {
    const invalid = createEmployeeSchema.safeParse({ fullName: 'A' });
    expect(invalid.success).toBe(false);
    const valid = createEmployeeSchema.safeParse({
      fullName: 'Riya Sharma',
      email: 'riya@smartsystem.com',
      phone: '+91 9845011001',
      gender: 'female',
      dateOfBirth: '1996-03-14',
      profileImage: '',
      department: 'engineering',
      designation: 'Engineer',
      joiningDate: '2024-01-01',
      employmentStatus: 'active',
      address: '14 Residency Road',
      password: 'Employee@123',
      confirmPassword: 'Employee@123',
      emergencyContact: { name: 'Anil Sharma', phone: '+91 9845022001', relationship: 'Father' },
    });
    expect(valid.success).toBe(true);
  });
});

describe('attendance, leave, and dashboard states', () => {
  it('disables attendance actions until check-in and check-out are valid', async () => {
    const onCheckIn = vi.fn();
    const onCheckOut = vi.fn();
    const { rerender } = render(<AttendanceActions today={null} loading={false} onCheckIn={onCheckIn} onCheckOut={onCheckOut} />);
    expect(screen.getByTestId('attendance-status')).toHaveTextContent('Not checked in');
    expect(screen.getByTestId('check-out')).toBeDisabled();
    await userEvent.click(screen.getByTestId('check-in'));
    expect(onCheckIn).toHaveBeenCalled();
    rerender(<AttendanceActions today={{ checkIn: '2026-11-03T04:00:00.000Z', status: 'present', workingHours: 0 }} loading={false} onCheckIn={onCheckIn} onCheckOut={onCheckOut} />);
    expect(screen.getByTestId('check-in')).toBeDisabled();
    expect(screen.getByTestId('check-out')).toBeEnabled();
    expect(screen.getByTestId('working-hours')).toHaveTextContent('0h 0m');
  });

  it('shows approval actions only for pending admin requests', () => {
    const leave = { id: 'leave-1', status: 'pending' };
    const { rerender } = render(<LeaveActions leave={leave} role="ADMIN" onApprove={vi.fn()} onReject={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByTestId('approve-leave-1')).toBeInTheDocument();
    rerender(<LeaveActions leave={leave} role="EMPLOYEE" onApprove={vi.fn()} onReject={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByTestId('approve-leave-1')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('rejects a leave range that ends before it starts', () => {
    const result = leaveSchema.safeParse({
      leaveType: 'casual',
      startDate: '2026-12-10',
      endDate: '2026-12-01',
      reason: 'Travel plans changed.',
    });
    expect(result.success).toBe(false);
  });

  it('paginates, shows errors, loading, and dashboard figures', async () => {
    const onPage = vi.fn();
    render(<Pagination page={1} totalPages={3} total={24} onPage={onPage} />);
    expect(screen.getByTestId('page-prev')).toBeDisabled();
    await userEvent.click(screen.getByTestId('page-next'));
    expect(onPage).toHaveBeenCalledWith(2);
    render(<ErrorBanner message="Unable to reach the server." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to reach the server.');
    render(<TableSkeleton />);
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    render(<KpiGrid items={[{ id: 'kpi-total-employees', label: 'Total employees', value: 10 }]} />);
    expect(screen.getByTestId('kpi-total-employees')).toHaveTextContent('10');
    expect(formatHours(1.5)).toBe('1h 30m');
  });

  it('debounces search text', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), { initialProps: { value: 'a' } });
    rerender({ value: 'ab' });
    expect(result.current).toBe('a');
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('ab');
    vi.useRealTimers();
  });
});
