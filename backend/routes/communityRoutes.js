const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
    createCommunity,
    getCommunities,
    addGroupToCommunity,
    removeGroupFromCommunity,
    joinCommunity,
    leaveCommunity,
    getCommunityById,
    addMembersToCommunity,
    getAvailableGroups,
    updateCommunityProfilePic
} = require('../controllers/communityControllers');

const router = express.Router();

router.route('/').post(protect, createCommunity);
router.route('/').get(protect, getCommunities);
router.route('/:id').get(protect, getCommunityById);
router.route('/add-group').put(protect, addGroupToCommunity);
router.route('/remove-group').delete(protect, removeGroupFromCommunity);
router.route('/join').post(protect, joinCommunity);
router.route('/leave').post(protect, leaveCommunity);
router.route('/:id/add-members').put(protect, addMembersToCommunity);
router.route('/:id/available-groups').get(protect, getAvailableGroups);
router.route('/:id/profile-pic').put(protect, updateCommunityProfilePic);

module.exports = router;
