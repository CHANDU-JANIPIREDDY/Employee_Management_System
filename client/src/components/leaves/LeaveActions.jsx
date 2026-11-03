import { Button } from '../common/Button';

export function LeaveActions({ leave, role, onApprove, onReject, onCancel }) {
  if (role === 'ADMIN' && leave.status === 'pending') {
    return (
      <div className="flex gap-2">
        <Button data-testid={`approve-${leave.id}`} onClick={() => onApprove(leave)}>Approve</Button>
        <Button data-testid={`reject-${leave.id}`} variant="secondary" onClick={() => onReject(leave)}>Reject</Button>
      </div>
    );
  }
  if (role === 'EMPLOYEE' && leave.status === 'pending') {
    return <Button variant="secondary" onClick={() => onCancel(leave)}>Cancel</Button>;
  }
  return <span className="text-xs text-slate-400">—</span>;
}
