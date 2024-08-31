const multer = require('multer');

// Configure multer storage
const storage = multer.memoryStorage(); // Store files in memory as Buffer
const upload = multer({ storage });

// Use this middleware in routes that require file uploads
