const express = require('express');
const multer = require('multer');
const ImageKit = require("imagekit");
const fs = require('fs');
const path = require('path');

console.log("✅ LOADING UPLOAD ROUTES - V6 (IMAGEKIT FIX)");

const router = express.Router();

// Initialize ImageKit (Re-using env vars from server.js context)
const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

// Configure Multer to save temporarily to disk (needed for stream upload to ImageKit or similar)
// Or use memoryStorage to avoid disk persistence issues on Render
const storage = multer.memoryStorage();

// File filter
function checkFileType(file, cb) {
    console.log("Processing File:", file.originalname, "Type:", file.mimetype);
    return cb(null, true);
}

// Initialize Multer
const uploadMiddleware = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    },
});

// Upload Endpoint
router.post('/', (req, res) => {
    const singleUpload = uploadMiddleware.single('file');

    singleUpload(req, res, async function (err) {
        if (err) {
            console.error("Multer Upload Error:", err);
            return res.status(400).json({
                message: "Upload failed during file processing",
                error: err.message || err
            });
        }

        if (!req.file) {
            console.error("No file received");
            return res.status(400).json({ message: 'No file received' });
        }

        try {
            console.log("Uploading to ImageKit...");

            // Upload to ImageKit
            const response = await imagekit.upload({
                file: req.file.buffer, // Buffer from memoryStorage
                fileName: req.file.originalname || `upload-${Date.now()}`,
                folder: "/uploads" // Optional: organize in folders
            });

            console.log("ImageKit Upload Success:", response.url);

            res.json({
                message: 'Image uploaded successfully',
                imageUrl: response.url,
                fileId: response.fileId
            });

        } catch (uploadError) {
            console.error("ImageKit Upload Error:", uploadError);
            res.status(500).json({
                message: "Failed to upload to ImageKit",
                error: uploadError.message
            });
        }
    });
});

module.exports = router;
