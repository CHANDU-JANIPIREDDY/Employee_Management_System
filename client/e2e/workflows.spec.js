import { expect, test } from '@playwright/test';

async function kpiNumber(page, testId) {
  const value = page.getByTestId(testId).locator('p').nth(1);
  await expect(value).toHaveText(/^\d+$/);
  return Number(await value.innerText());
}

async function login(page, email, password) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('nav-dashboard')).toBeVisible();
}

test.describe.configure({ mode: 'serial' });

test('admin manages departments, employees, and leave', async ({ page }) => {
  const stamp = Date.now();
  await login(page, 'admin@smartsystem.com', 'Admin@123');
  await expect(page.getByTestId('kpi-total-employees')).toBeVisible();
  const pendingBefore = await kpiNumber(page, 'kpi-pending-leaves');

  await page.getByTestId('nav-departments').click();
  await page.getByTestId('add-department').click();
  await page.getByTestId('department-name').fill(`Research ${stamp}`);
  await page.getByTestId('department-description').fill('Applied research and internal tools.');
  await page.getByTestId('department-save').click();
  await expect(page.getByText(`Research ${stamp}`)).toBeVisible();

  await page.getByTestId('nav-employees').click();
  await page.getByTestId('add-employee').click();
  await page.getByTestId('employee-name').fill(`Test Hire ${stamp}`);
  await page.getByTestId('employee-email').fill(`hire.${stamp}@smartsystem.com`);
  await page.getByTestId('employee-phone').fill('+91 9845012345');
  await page.getByTestId('employee-dob').fill('1995-05-12');
  await page.getByTestId('employee-joining').fill('2024-04-01');
  await page.getByTestId('employee-department').selectOption({ label: `Research ${stamp}` });
  await page.getByTestId('employee-designation').fill('Research Associate');
  await page.getByTestId('employee-address').fill('12 Test Street, Pune');
  await page.getByTestId('employee-emergency-name').fill('Asha Hire');
  await page.getByTestId('employee-emergency-phone').fill('+91 9845099999');
  await page.getByTestId('employee-emergency-relationship').fill('Sister');
  await page.getByTestId('employee-password').fill('Employee@123');
  await page.getByTestId('employee-confirm-password').fill('Employee@123');
  await page.getByTestId('save-employee').click();

  await page.getByTestId('employee-search').fill(`Test Hire ${stamp}`);
  await expect(page.getByText(`Test Hire ${stamp}`)).toBeVisible();
  await page.getByRole('button', { name: 'Actions' }).click();
  await page.getByRole('menuitem', { name: 'View' }).click();
  await expect(page.getByRole('heading', { name: `Test Hire ${stamp}` })).toBeVisible();
  await page.getByTestId('edit-employee').click();
  await page.getByTestId('employee-designation').fill('Senior Research Associate');
  await page.getByTestId('save-employee').click();
  await expect(page.getByText('Senior Research Associate')).toBeVisible();

  await page.getByTestId('nav-attendance').click();
  await expect(page.getByTestId('stat-present')).toBeVisible();
  await page.getByTestId('nav-leaves').click();
  await page.locator('[data-testid^="approve-"]').first().click();
  await page.getByTestId('confirm-leave').click();
  await expect(page.getByText('Leave approved')).toBeVisible();

  await page.getByTestId('nav-dashboard').click();
  const pendingAfter = await kpiNumber(page, 'kpi-pending-leaves');
  expect(pendingAfter).toBeLessThan(pendingBefore);
});

test('employee checks attendance, applies for leave, and updates profile', async ({ page }) => {
  await login(page, 'employee@smartsystem.com', 'Employee@123');
  await page.getByTestId('nav-attendance').click();
  await page.getByTestId('check-in').click();
  await expect(page.getByTestId('attendance-status')).not.toHaveText('Not checked in', { timeout: 15000 });
  await page.getByTestId('check-out').click();
  await expect(page.getByTestId('working-hours')).toHaveText(/\d+h \d+m/);

  const start = new Date();
  start.setDate(start.getDate() + 70);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  const startKey = start.toISOString().slice(0, 10);
  const endKey = end.toISOString().slice(0, 10);

  await page.getByTestId('nav-leaves').click();
  await expect(page.getByTestId('balance-casual')).toBeVisible();
  await page.getByTestId('apply-leave').click();
  await page.getByTestId('leave-type').selectOption('casual');
  await page.getByTestId('leave-start').fill(startKey);
  await page.getByTestId('leave-end').fill(endKey);
  await page.getByTestId('leave-reason').fill('Family visit planned around the holiday.');
  await page.getByTestId('submit-leave').click();
  await expect(page.getByText('Pending').first()).toBeVisible();

  await page.getByTestId('nav-attendance').click();
  await expect(page.getByText(startKey.slice(0, 7) === '' ? 'Date' : 'Date').first()).toBeVisible();
  await page.getByTestId('nav-profile').click();
  await expect(page.getByTestId('profile-phone')).not.toHaveValue('');
  await page.getByTestId('profile-phone').fill('+91 9000011122');
  await page.getByTestId('save-profile').click();
  await expect(page.getByText('Profile updated')).toBeVisible();
  await expect(page.getByTestId('profile-phone')).toHaveValue('+91 9000011122');
  await page.getByTestId('nav-logout').click();
  await expect(page.getByTestId('login-submit')).toBeVisible();
});

test('employee actions that belong to admins are blocked', async ({ page, request }) => {
  await login(page, 'employee@smartsystem.com', 'Employee@123');
  await page.goto('/employees');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('add-employee')).toHaveCount(0);

  const token = await page.evaluate(() => localStorage.getItem('token'));
  const headers = { Authorization: `Bearer ${token}` };
  const adminLogin = await request.post('http://localhost:5000/api/auth/login', {
    data: { email: 'admin@smartsystem.com', password: 'Admin@123' },
  });
  const adminToken = (await adminLogin.json()).data.token;
  const directory = await request.get('http://localhost:5000/api/employees?limit=10', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const others = (await directory.json()).data.filter((item) => item.email !== 'employee@smartsystem.com');
  const forbiddenEmployee = await request.get(`http://localhost:5000/api/employees/${others[0].id}`, { headers });
  expect(forbiddenEmployee.status()).toBe(403);

  const create = await request.post('http://localhost:5000/api/employees', { headers, data: { fullName: 'Blocked' } });
  expect(create.status()).toBe(403);

  const apply = await request.post('http://localhost:5000/api/leaves', {
    headers,
    data: {
      leaveType: 'sick',
      startDate: '2027-03-16',
      endDate: '2027-03-16',
      reason: 'Security check leave request that must stay unapproved.',
    },
  });
  expect(apply.ok()).toBeTruthy();
  const leaveId = (await apply.json()).data.id;
  const approve = await request.patch(`http://localhost:5000/api/leaves/${leaveId}/approve`, {
    headers,
    data: { remarks: 'Should not work' },
  });
  expect(approve.status()).toBe(403);

  const dashboard = await request.get('http://localhost:5000/api/dashboard/admin', { headers });
  expect(dashboard.status()).toBe(403);
});
