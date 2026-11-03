import { AuditLog } from '../models/AuditLog.js';
import { withSession } from '../utils/transaction.js';

export async function writeAudit(entry, session) {
  await AuditLog.create([{
    actor: entry.actor?._id || entry.actor || null,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId || null,
    message: entry.message,
  }], withSession(session));
}
