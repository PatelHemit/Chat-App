const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createCommunity, getCommunities, addGroupToCommunity } = require('../controllers/communityControllers');

const router = express.Router();

router.route('/').post(protect, createCommunity);
router.route('/').get(protect, getCommunities);
router.route('/add-group').put(protect, addGroupToCommunity);

module.exports = router;
