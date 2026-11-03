import { asyncHandler } from '../utils/asyncHandler.js';
import { send } from '../utils/response.js';
import * as notificationService from '../services/notificationService.js';

export const list = asyncHandler(async (req, res) => {
  const result = await notificationService.listNotifications(req.user, req.validated.query);
  return send(res, 200, {
    message: 'Notifications fetched',
    data: result.items,
    unreadCount: result.unreadCount,
    pagination: result.pagination,
  });
});

export const read = asyncHandler(async (req, res) => {
  const notification = await notificationService.markNotificationRead(req.user, req.validated.params.id);
  return send(res, 200, { message: 'Notification marked as read', data: notification });
});

export const readAll = asyncHandler(async (req, res) => {
  await notificationService.markAllNotificationsRead(req.user);
  return send(res, 200, { message: 'Notifications marked as read', data: null });
});
