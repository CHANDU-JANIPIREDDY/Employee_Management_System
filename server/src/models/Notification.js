import mongoose from 'mongoose';
import { withJson } from '../utils/schema.js';

const notificationSchema = withJson(new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, required: true },
    link: { type: String, default: '' },
    read: { type: Boolean, default: false },
    dedupeKey: { type: String },
  },
  { timestamps: true },
));

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

export const Notification = mongoose.model('Notification', notificationSchema);
