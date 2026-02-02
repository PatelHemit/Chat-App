const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getNotifications, createNotification, markAsRead } = require('../controllers/notificationControllers');

const router = express.Router();

router.route('/').get(protect, getNotifications);
router.route('/').post(protect, createNotification);
router.route('/:id/read').put(protect, markAsRead);

module.exports = router;
