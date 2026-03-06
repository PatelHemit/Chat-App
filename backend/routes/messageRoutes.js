const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
    sendMessage,
    allMessages,
    deleteMessage,
    deleteMessageForMe,
    addReaction,
    removeReaction,
    toggleStar,
    getMessageInfo
} = require('../controllers/messageControllers');

const { generateLiveKitToken } = require('../controllers/livekitController');
const router = express.Router();

router.route('/livekit/token').post(protect, generateLiveKitToken);

router.route('/').post(protect, sendMessage);
router.route('/:chatId').get(protect, allMessages);
router.route('/info/:id').get(protect, getMessageInfo);
router.route('/delete-for-me').post(protect, deleteMessageForMe);
router.route('/:id').delete(protect, deleteMessage);
router.route('/react').put(protect, addReaction);
router.route('/unreact').put(protect, removeReaction);
router.route('/star').put(protect, toggleStar);

module.exports = router;
