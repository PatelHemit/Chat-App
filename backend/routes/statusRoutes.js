const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createStatus, getStatuses } = require('../controllers/statusControllers');

const router = express.Router();

router.route('/').post(protect, createStatus);
router.route('/').get(protect, getStatuses);

module.exports = router;
