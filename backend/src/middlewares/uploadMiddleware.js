import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Dossier d'upload (à la racine du backend)
const UPLOAD_DIR = path.resolve('uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Whitelist : PDF, DOCX, PNG, JPG/JPEG
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword', // .doc / fallback pour certains DOCX
  'image/png',
  'image/jpeg',
  'image/jpg',
]);
const ALLOWED_EXT = new Set(['.pdf', '.docx', '.doc', '.png', '.jpg', '.jpeg']);

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const ticketDir = path.join(UPLOAD_DIR, req.params.id || 'tmp');
    if (!fs.existsSync(ticketDir)) fs.mkdirSync(ticketDir, { recursive: true });
    cb(null, ticketDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_\.]/g, '_').slice(0, 60);
    const rand = crypto.randomBytes(4).toString('hex');
    cb(null, `${Date.now()}-${rand}-${safeBase}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.has(ext) || !ALLOWED_MIME.has(file.mimetype)) {
    return cb(new Error(`Type de fichier interdit : ${file.originalname}. Autorisés : pdf, docx, png, jpg, jpeg.`));
  }
  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 Mo par fichier
    files: 5,                    // max 5 fichiers par requête
  },
});

// === Upload spécifique aux images de réclamations ===
// Dossier : uploads/complaints/tmp puis renommé après création de la complaint
// (ici on stocke dans /uploads/complaints/{complaintId}/ via un placeholder dynamique)
const IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg']);
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg']);

const complaintStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    // À la création, on ne connaît pas encore l'ID de complaint
    // -> on stocke temporairement dans uploads/complaints/_tmp/{requestId}
    const tmpId = req.headers['x-tmp-id'] || Date.now().toString();
    const dir = path.join(UPLOAD_DIR, 'complaints', '_tmp', tmpId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    req._tmpComplaintDir = dir;
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_\.]/g, '_').slice(0, 60);
    const rand = crypto.randomBytes(4).toString('hex');
    cb(null, `${Date.now()}-${rand}-${safeBase}${ext}`);
  },
});

function imageFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!IMAGE_EXT.has(ext) || !IMAGE_MIME.has(file.mimetype)) {
    return cb(new Error(`Type d'image interdit : ${file.originalname}. Autorisés : PNG, JPG, JPEG.`));
  }
  cb(null, true);
}

export const uploadComplaintImages = multer({
  storage: complaintStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});

// Helper : déplace les fichiers du dossier _tmp vers complaints/{complaintId}
export function moveComplaintImages(req, complaintId) {
  if (!req._tmpComplaintDir || !req.files?.length) return;
  const finalDir = path.join(UPLOAD_DIR, 'complaints', complaintId);
  if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });
  for (const f of req.files) {
    const src = path.join(req._tmpComplaintDir, f.filename);
    const dst = path.join(finalDir, f.filename);
    try { fs.renameSync(src, dst); } catch (e) { /* ignore */ }
  }
  // Cleanup tmp dir
  try { fs.rmdirSync(req._tmpComplaintDir); } catch { /* ignore */ }
}

// === Upload des fichiers de rapport d'intervention ===
// Mêmes types que les pièces jointes générales (PDF, DOCX, PNG, JPG).
const reportStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const tmpId = req.headers['x-tmp-id'] || Date.now().toString();
    const dir = path.join(UPLOAD_DIR, 'reports', '_tmp', tmpId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    req._tmpReportDir = dir;
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_\.]/g, '_').slice(0, 60);
    const rand = crypto.randomBytes(4).toString('hex');
    cb(null, `${Date.now()}-${rand}-${safeBase}${ext}`);
  },
});

export const uploadReportFiles = multer({
  storage: reportStorage,
  fileFilter, // même whitelist que les pièces jointes (pdf/docx/png/jpg)
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
});

// Déplace les fichiers du dossier _tmp vers reports/{reportId} une fois l'ID connu.
export function moveReportFiles(req, reportId) {
  if (!req._tmpReportDir || !req.files?.length) return;
  const finalDir = path.join(UPLOAD_DIR, 'reports', reportId);
  if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });
  for (const f of req.files) {
    const src = path.join(req._tmpReportDir, f.filename);
    const dst = path.join(finalDir, f.filename);
    try { fs.renameSync(src, dst); } catch (e) { /* ignore */ }
  }
  try { fs.rmdirSync(req._tmpReportDir); } catch { /* ignore */ }
}

export { UPLOAD_DIR };
