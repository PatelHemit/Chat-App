const express = require('express');
const multer = require('multer');
const path = require('path');

console.log("✅ LOADING UPLOAD ROUTES - V5 (CLEAN URL FIX)");

const router = express.Router();

// Storage configuration
const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename(req, file, cb) {
        cb(
            null,
            `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
        );
    },
});

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

    singleUpload(req, res, function (err) {
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

        // FORCE CORRECT URL GENERATION
        // We use just the filename, not the full path.
        const filename = req.file.filename;
        const relativeUrl = `uploads/${filename}`;

        // Construct the full URL: http://localhost:3000/uploads/image-xyz.jpg
        const fullUrl = `${req.protocol}://${req.get('host')}/${relativeUrl}`;

        console.log("Upload Success (V5):", fullUrl);

        res.json({
            message: 'Image uploaded successfully',
            imageUrl: fullUrl,
            filePath: `/${relativeUrl}`
        });
    });
});

module.exports = router;
