const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createStatus, getStatuses, viewStatus } = require('../controllers/statusControllers');

const router = express.Router();

router.route('/').post(protect, createStatus);
router.route('/').get(protect, getStatuses);
router.route('/:id/view').post(protect, viewStatus);

module.exports = router;
