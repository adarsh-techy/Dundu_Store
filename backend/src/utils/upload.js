const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

// File filter
const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only JPEG, PNG, WebP allowed'));
};

const limits = { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 };

let uploadMiddleware;

if (isCloudinaryConfigured) {
  // Use memory storage for Cloudinary
  const storage = multer.memoryStorage();
  uploadMiddleware = multer({ storage, fileFilter, limits });
} else {
  // Use local disk storage
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, process.env.UPLOAD_DIR || 'uploads'),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    },
  });
  uploadMiddleware = multer({ storage, fileFilter, limits });
}

// Helper to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, originalname) => {
  return new Promise((resolve, reject) => {
    const folder = 'velora';
    // Remove extension for public_id prefix
    const publicId = path.parse(originalname).name.replace(/[^a-zA-Z0-9]/g, '_') + '_' + uuidv4().substring(0, 8);
    
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'auto'
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    
    const readable = new Readable();
    readable._read = () => {};
    readable.push(buffer);
    readable.push(null);
    readable.pipe(stream);
  });
};

// Wrapper middleware to support both single, array and any files
const makeCloudinaryUpload = (multerInstance) => {
  return {
    single: (fieldname) => {
      const original = multerInstance.single(fieldname);
      return (req, res, next) => {
        original(req, res, async (err) => {
          if (err) return next(err);
          if (isCloudinaryConfigured && req.file) {
            try {
              const result = await uploadToCloudinary(req.file.buffer, req.file.originalname);
              req.file.path = result.secure_url;
              req.file.filename = result.secure_url;
            } catch (uploadErr) {
              return next(uploadErr);
            }
          }
          next();
        });
      };
    },
    array: (fieldname, maxCount) => {
      const original = multerInstance.array(fieldname, maxCount);
      return (req, res, next) => {
        original(req, res, async (err) => {
          if (err) return next(err);
          if (isCloudinaryConfigured && req.files && req.files.length) {
            try {
              const uploadPromises = req.files.map(async (file) => {
                const result = await uploadToCloudinary(file.buffer, file.originalname);
                file.path = result.secure_url;
                file.filename = result.secure_url;
              });
              await Promise.all(uploadPromises);
            } catch (uploadErr) {
              return next(uploadErr);
            }
          }
          next();
        });
      };
    },
    any: () => {
      const original = multerInstance.any();
      return (req, res, next) => {
        original(req, res, async (err) => {
          if (err) return next(err);
          if (isCloudinaryConfigured && req.files && req.files.length) {
            try {
              const uploadPromises = req.files.map(async (file) => {
                const result = await uploadToCloudinary(file.buffer, file.originalname);
                file.path = result.secure_url;
                file.filename = result.secure_url;
              });
              await Promise.all(uploadPromises);
            } catch (uploadErr) {
              return next(uploadErr);
            }
          }
          next();
        });
      };
    }
  };
};

const finalUpload = isCloudinaryConfigured ? makeCloudinaryUpload(uploadMiddleware) : uploadMiddleware;

const getFileUrl = (file) => {
  if (!file) return null;
  if (file.filename && (file.filename.startsWith('http://') || file.filename.startsWith('https://'))) {
    return file.filename;
  }
  if (file.path && (file.path.startsWith('http://') || file.path.startsWith('https://'))) {
    return file.path;
  }
  return `/uploads/${file.filename}`;
};

module.exports = {
  single: (fieldname) => finalUpload.single(fieldname),
  array: (fieldname, maxCount) => finalUpload.array(fieldname, maxCount),
  any: () => finalUpload.any(),
  getFileUrl
};
