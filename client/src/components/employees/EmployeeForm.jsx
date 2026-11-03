import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEmployeeSchema, editEmployeeSchema } from '../../validations/schemas';
import { Input, Select, Textarea } from '../common/Fields';
import { Button } from '../common/Button';
import { idOf } from '../../utils/format';

const EMPTY = {
  fullName: '',
  email: '',
  phone: '',
  gender: 'female',
  dateOfBirth: '',
  profileImage: '',
  department: '',
  designation: '',
  joiningDate: '',
  employmentStatus: 'active',
  address: '',
  password: '',
  confirmPassword: '',
  emergencyContact: { name: '', phone: '', relationship: '' },
};

export function EmployeeForm({ mode, employee, departments, saving, onSubmit, onCancel }) {
  const schema = mode === 'create' ? createEmployeeSchema : editEmployeeSchema;
  const form = useForm({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const { register, handleSubmit, reset, formState: { errors } } = form;

  useEffect(() => {
    if (!employee) {
      reset(EMPTY);
      return;
    }
    reset({
      ...EMPTY,
      ...employee,
      department: idOf(employee.department),
      profileImage: employee.profileImage || '',
      emergencyContact: employee.emergencyContact || EMPTY.emergencyContact,
    });
  }, [employee, reset]);

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)} data-testid="employee-form">
      <Input label="Full name" required error={errors.fullName?.message} data-testid="employee-name" {...register('fullName')} />
      <Input label="Email" type="email" required error={errors.email?.message} data-testid="employee-email" {...register('email')} />
      <Input label="Phone" required error={errors.phone?.message} data-testid="employee-phone" {...register('phone')} />
      <Select label="Gender" required error={errors.gender?.message} {...register('gender')}>
        <option value="female">Female</option>
        <option value="male">Male</option>
        <option value="other">Other</option>
      </Select>
      <Input label="Date of birth" type="date" required error={errors.dateOfBirth?.message} data-testid="employee-dob" {...register('dateOfBirth')} />
      <Input label="Joining date" type="date" required error={errors.joiningDate?.message} data-testid="employee-joining" {...register('joiningDate')} />
      <Select label="Department" required error={errors.department?.message} data-testid="employee-department" {...register('department')}>
        <option value="">Select department</option>
        {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
      </Select>
      <Input label="Designation" required error={errors.designation?.message} data-testid="employee-designation" {...register('designation')} />
      <Select label="Employment status" required error={errors.employmentStatus?.message} {...register('employmentStatus')}>
        <option value="active">Active</option>
        <option value="on_leave">On Leave</option>
        <option value="inactive">Inactive</option>
        <option value="terminated">Terminated</option>
      </Select>
      <Input label="Profile image URL" error={errors.profileImage?.message} {...register('profileImage')} />
      {mode === 'create' ? (
        <>
          <Input label="Temporary password" type="password" required error={errors.password?.message} data-testid="employee-password" {...register('password')} />
          <Input label="Confirm password" type="password" required error={errors.confirmPassword?.message} data-testid="employee-confirm-password" {...register('confirmPassword')} />
        </>
      ) : null}
      <div className="md:col-span-2">
        <Textarea label="Address" required error={errors.address?.message} data-testid="employee-address" {...register('address')} />
      </div>
      <Input label="Emergency contact" required error={errors.emergencyContact?.name?.message} data-testid="employee-emergency-name" {...register('emergencyContact.name')} />
      <Input label="Emergency phone" required error={errors.emergencyContact?.phone?.message} data-testid="employee-emergency-phone" {...register('emergencyContact.phone')} />
      <Input label="Relationship" required error={errors.emergencyContact?.relationship?.message} data-testid="employee-emergency-relationship" {...register('emergencyContact.relationship')} />
      <div className="flex justify-end gap-2 md:col-span-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={saving} data-testid="save-employee">{mode === 'create' ? 'Create employee' : 'Save changes'}</Button>
      </div>
    </form>
  );
}
