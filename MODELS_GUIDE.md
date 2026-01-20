# WhatsApp Clone Models Guide

Here is a practical guide on how to use the 3 new models (`Status`, `Call`, `Community`) in your Node.js/Express backend.

---

## 1. Status Model (`models/Status.js`)

**Purpose**: Stores photos/videos that users upload as their "Status".
**Special Feature**: It has a **TTL (Time To Live) Index** (`expiresAfterSeconds: 86400`). This means MongoDB will **automatically delete** the status 24 hours after it is created. You don't need to write any cron job!

### How to Use in Controller:

**A. Uploading a Status:**
```javascript
const Status = require('../models/Status');

const createStatus = async (req, res) => {
    const { mediaUrl, caption, mediaType } = req.body;
    
    const newStatus = await Status.create({
        user: req.user._id,        // Logged in user
        mediaUrl: mediaUrl,        // URL from ImageKit/Cloudinary
        mediaType: mediaType,      // "image" or "video"
        caption: caption
    });

    res.json(newStatus);
};
```

**B. Fetching Statuses (Updates Tab):**
```javascript
// Get statuses from people I follow (or just all for now)
const getStatuses = async (req, res) => {
    // Populate shows the user's name/pic instead of just ID
    const statuses = await Status.find()
        .populate("user", "name profilePic")
        .sort({ createdAt: -1 }); // Newest first

    res.json(statuses);
};
```

---

## 2. Call Model (`models/Call.js`)

**Purpose**: This is a **Log**. It doesn't make the call work (that's Socket.io/WebRTC), but it *remembers* that a call happened so you can show it in the "Calls" tab history.

### How to Use in Controller:

**A. Saving a Call Log (After call ends):**
```javascript
const Call = require('../models/Call');

const logCall = async (req, res) => {
    const { receiverId, type, status, duration } = req.body;

    await Call.create({
        caller: req.user._id,
        receiver: receiverId,
        type: type,       // "audio" or "video"
        status: status,   // "missed", "answered"
        duration: duration // in seconds
    });

    res.send("Call Logged");
};
```

**B. Getting Call History:**
```javascript
const getCallHistory = async (req, res) => {
    const myId = req.user._id;

    // Find calls where I was either the caller OR the receiver
    const calls = await Call.find({
        $or: [
            { caller: myId },
            { receiver: myId }
        ]
    })
    .populate("caller", "name profilePic")
    .populate("receiver", "name profilePic")
    .sort({ createdAt: -1 });

    res.json(calls);
};
```

---

## 3. Community Model (`models/Community.js`)

**Purpose**: A Community is like a "Super Group". It has an Admin and contains multiple "Groups" inside it.

### How to Use in Controller:

**A. Create a Community:**
```javascript
const Community = require('../models/Community');

const createCommunity = async (req, res) => {
    const { name, description, profilePic } = req.body;

    const newCommunity = await Community.create({
        name,
        description,
        profilePic,
        admin: req.user._id,
        users: [req.user._id] // Admin is the first member
    });

    res.json(newCommunity);
};
```

**B. Add a Group to Community:**
```javascript
const addGroupToCommunity = async (req, res) => {
    const { communityId, groupId } = req.body;

    // Push the group ID into the 'groups' array
    const updatedCommunity = await Community.findByIdAndUpdate(
        communityId,
        { $push: { groups: groupId } },
        { new: true }
    )
    .populate("groups"); // Return actual group details

    res.json(updatedCommunity);
};
```

---

## Summary

| Model | Tab in App | Key Feature |
| :--- | :--- | :--- |
| **Status** | Updates | Auto-deletes after 24h (MongoDB efficiency). |
| **Call** | Calls | Just a history log. Use distinct queries to find calls. |
| **Community** | Communities | Relational data: One Community -> Many Groups. |
