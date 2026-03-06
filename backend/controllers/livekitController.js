const asyncHandler = require("express-async-handler");
const { AccessToken } = require("livekit-server-sdk");

// @desc    Generate LiveKit Access Token
// @route   POST /api/message/livekit/token
// @access  Protected
const generateLiveKitToken = asyncHandler(async (req, res) => {
    const { roomName, participantName, participantIdentity } = req.body;

    if (!roomName || !participantName) {
        res.status(400);
        throw new Error("Room name and participant name are required");
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
        res.status(500);
        throw new Error("Server misconfigured: LiveKit credentials missing");
    }

    // Use unique identity if provided, otherwise fallback to name
    const identity = participantIdentity || participantName;

    const at = new AccessToken(apiKey, apiSecret, {
        identity: identity,
        name: participantName, // Display name
    });

    at.addGrant({ roomJoin: true, room: roomName });

    const token = await at.toJwt();

    res.json({ token });
});

module.exports = { generateLiveKitToken };
