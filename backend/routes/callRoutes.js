const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { logCall, getCallHistory } = require('../controllers/callControllers');

const router = express.Router();

router.route('/').post(protect, logCall);
router.route('/').get(protect, getCallHistory);

module.exports = router;
