const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }
});
const uploadDirectory = path.join(__dirname, '..', '..', 'public', 'uploads');

function imageExtension(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buffer.length >= 6 && /^GIF8[79]a$/.test(buffer.toString('ascii', 0, 6))) return 'gif';
  return null;
}

router.post('/', requireAdmin, upload.single('image'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ message: 'Selecione uma imagem para carregar' });
  const extension = imageExtension(req.file.buffer);
  if (!extension) return res.status(400).json({ message: 'Ficheiro inválido. Use uma imagem PNG, JPEG, WEBP ou GIF.' });
  try {
    await fs.mkdir(uploadDirectory, { recursive: true });
    const filename = `${crypto.randomUUID()}.${extension}`;
    await fs.writeFile(path.join(uploadDirectory, filename), req.file.buffer, { flag: 'wx' });
    res.status(201).json({ imageUrl: `/uploads/${filename}` });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
