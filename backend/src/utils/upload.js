const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

// Cloudinary is used only when all three keys are real values (not the `your_...`
// placeholders from .env.example) AND it is switched on. USE_CLOUDINARY=true|false
// forces it; when unset it is on in production and off in development, so local dev
// saves to the uploads/ folder.
const hasCloudinaryKeys = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
  .every((key) => process.env[key] && !process.env[key].startsWith('your_'));
const cloudinaryWanted = process.env.USE_CLOUDINARY
  ? process.env.USE_CLOUDINARY === 'true'
  : process.env.NODE_ENV === 'production';
const isCloudinaryConfigured = hasCloudinaryKeys && cloudinaryWanted;
console.log(`[upload] storage: ${isCloudinaryConfigured ? 'Cloudinary' : 'local disk (uploads/)'}`);

// Allowed image types. The stored extension is derived from the declared type (never
// from the client-supplied filename) and the file's magic bytes are checked after the
// write, so an "image/png" part named evil.html cannot end up served as HTML.
const ALLOWED_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const UPLOAD_ERROR = 'Only JPEG, PNG, WebP allowed';

const fileFilter = (_req, file, cb) => {
  ALLOWED_TYPES[file.mimetype] ? cb(null, true) : cb(new Error(UPLOAD_ERROR));
};

const sniffImageType = (buf) => {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
};

const readHead = (file) => {
  if (file.buffer) return file.buffer.subarray(0, 12);
  const fd = fs.openSync(file.path, 'r');
  try {
    const head = Buffer.alloc(12);
    const n = fs.readSync(fd, head, 0, 12, 0);
    return head.subarray(0, n);
  } finally {
    fs.closeSync(fd);
  }
};

// Runs after multer: verifies every accepted file really is the image type it claimed.
// Files that fail are removed from disk and the request is rejected.
const verifyImages = (req, _res, next) => {
  const files = [...(req.file ? [req.file] : []), ...(Array.isArray(req.files) ? req.files : [])];
  for (const file of files) {
    let actual = null;
    try { actual = sniffImageType(readHead(file)); } catch { actual = null; }
    if (!actual || !ALLOWED_TYPES[actual]) {
      for (const f of files) {
        if (f.path && !f.buffer) fs.promises.unlink(f.path).catch(() => {});
      }
      return next(new Error(UPLOAD_ERROR));
    }
  }
  next();
};

const filesLookValid = (req) => {
  const files = [...(req.file ? [req.file] : []), ...(Array.isArray(req.files) ? req.files : [])];
  return files.every((f) => { try { return !!ALLOWED_TYPES[sniffImageType(readHead(f))]; } catch { return false; } });
};

const withVerify = (mw) => (req, res, next) => mw(req, res, (err) => (err ? next(err) : verifyImages(req, res, next)));

const limits = { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 };

let uploadMiddleware;

if (isCloudinaryConfigured) {
  // Use memory storage for Cloudinary
  const storage = multer.memoryStorage();
  uploadMiddleware = multer({ storage, fileFilter, limits });
} else {
  // Use local disk storage - automatically ensure destination directory exists
  const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      cb(null, `${uuidv4()}${ALLOWED_TYPES[file.mimetype] || '.bin'}`);
    },
  });
  uploadMiddleware = multer({ storage, fileFilter, limits });
}

// Helper to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, originalname) => {
  return new Promise((resolve, reject) => {
    const folder = 'dundu';
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
          if (!filesLookValid(req)) return next(new Error(UPLOAD_ERROR));
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
          if (!filesLookValid(req)) return next(new Error(UPLOAD_ERROR));
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
          if (!filesLookValid(req)) return next(new Error(UPLOAD_ERROR));
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
  single: (fieldname) => withVerify(finalUpload.single(fieldname)),
  array: (fieldname, maxCount) => withVerify(finalUpload.array(fieldname, maxCount)),
  any: () => withVerify(finalUpload.any()),
  getFileUrl
};
