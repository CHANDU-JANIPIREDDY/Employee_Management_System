import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { buildPagination } from '../utils/pagination.js';
import { withSession } from '../utils/transaction.js';

export async function notifyUser(recipient, payload, session) {
  await Notification.create([{
    recipient,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    link: payload.link || '',
    read: false,
  }], withSession(session));
}

export async function notifyAdmins(payload, session) {
  const query = User.find({ role: 'ADMIN', isActive: true }).select('_id');
  if (session) query.session(session);
  const admins = await query;
  if (!admins.length) return;
  await Notification.insertMany(admins.map((admin) => ({
    recipient: admin._id,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    link: payload.link || '',
    read: false,
  })), withSession(session));
}

export async function listNotifications(user, query) {
  const filter = { recipient: user._id };
  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, read: false }),
  ]);
  return {
    items,
    unreadCount,
    pagination: buildPagination(query.page, query.limit, total),
  };
}

export async function markNotificationRead(user, id) {
  const notification = await Notification.findOneAndUpdate(
    { _id: id, recipient: user._id },
    { read: true },
    { new: true },
  );
  if (!notification) throw new ApiError(404, 'Notification not found');
  return notification;
}

export async function markAllNotificationsRead(user) {
  await Notification.updateMany({ recipient: user._id, read: false }, { read: true });
}
