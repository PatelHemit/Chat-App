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

// Configure Multer to save to disk
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../uploads');
        // Ensure directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Sanitize filename: decode URI, replace spaces and special chars with underscores
        const originalName = file.originalname || 'file';
        let sanitized = originalName;
        try {
            sanitized = decodeURIComponent(originalName);
        } catch (e) {
            console.log("Failed to decode filename:", originalName);
        }

        // Remove special characters and replace spaces with underscores
        sanitized = sanitized.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9.\-_]/g, '');

        // Ensure it's not empty and has a timestamp to avoid collisions
        const namePart = path.parse(sanitized).name || 'file';
        const extPart = path.parse(sanitized).ext || path.extname(originalName);
        cb(null, `${namePart}-${Date.now()}${extPart}`);
    }
});

// File filter
function checkFileType(file, cb) {
    console.log("Processing File:", file.originalname, "Type:", file.mimetype);
    return cb(null, true);
}

// Initialize Multer
const uploadMiddleware = multer({
    storage: storage,
    limits: {
        fileSize: 200 * 1024 * 1024 // 200MB limit
    },
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
            // Construct Local URL
            const localUrl = `/uploads/${req.file.filename}`;
            console.log("✅ Local File Saved:", localUrl);

            // Optional: Still upload to ImageKit for backup/production if needed
            // For now, return LOCAL URL to ensure immediate fix

            const fileMetadata = {
                fileName: req.file.originalname,
                fileSize: req.file.size,
                fileExtension: path.extname(req.file.originalname),
                mimeType: req.file.mimetype
            };

            res.json({
                message: 'File uploaded successfully',
                imageUrl: localUrl, // Return local path!
                fileId: req.file.filename,
                fileMetadata: fileMetadata
            });

        } catch (uploadError) {
            console.error("Upload Logic Error:", uploadError);
            res.status(500).json({
                message: "Failed to process upload",
                error: uploadError.message
            });
        }
    });
});

module.exports = router;
