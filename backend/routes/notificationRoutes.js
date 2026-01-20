const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getNotifications, createNotification } = require('../controllers/notificationControllers');

const router = express.Router();

router.route('/').get(protect, getNotifications);
router.route('/').post(protect, createNotification);

module.exports = router;
