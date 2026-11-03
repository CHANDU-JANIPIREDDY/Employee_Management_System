import mongoose from 'mongoose';
import { withJson } from '../utils/schema.js';

const auditLogSchema = withJson(new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    message: { type: String, required: true },
  },
  { timestamps: true },
));

auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
