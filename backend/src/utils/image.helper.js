const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Ototimiza uma imagem enviada:
 * 1. Converte para formato WebP com 80% de qualidade.
 * 2. Salva dentro da subpasta especificada (produtos, categorias, restaurantes, clientes).
 * 3. Gera uma miniatura (thumbnail) de 250px de largura.
 * 4. Remove o arquivo original temporário enviado pelo multer.
 * 
 * @param {object} file - Objeto de arquivo do multer (req.file)
 * @param {string} subfolder - Nome da subpasta ('produtos', 'categorias', 'restaurantes', 'clientes')
 * @returns {Promise<{ imageUrl: string, thumbUrl: string }>}
 */
const optimizeAndSaveImage = async (file, subfolder = 'produtos') => {
  if (!file) return null;

  const uploadDir = path.join(__dirname, '../..', process.env.UPLOAD_DIR || 'uploads');
  const targetDir = path.join(uploadDir, subfolder);

  // Garante que o diretório de destino exista
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const baseName = path.basename(file.filename, path.extname(file.filename));
  const outputFileName = `${baseName}.webp`;
  const outputThumbFileName = `${baseName}-thumb.webp`;

  const outputPath = path.join(targetDir, outputFileName);
  const outputThumbPath = path.join(targetDir, outputThumbFileName);

  // Processa imagem principal
  await sharp(file.path)
    .webp({ quality: 80 })
    .toFile(outputPath);

  // Processa miniatura
  await sharp(file.path)
    .resize(250)
    .webp({ quality: 75 })
    .toFile(outputThumbPath);

  // Remove arquivo temporário original
  if (fs.existsSync(file.path) && file.path !== outputPath) {
    try {
      fs.unlinkSync(file.path);
    } catch (err) {
      console.warn('[Image Helper] Falha ao deletar arquivo temporário:', err.message);
    }
  }

  return {
    imageUrl: `/uploads/${subfolder}/${outputFileName}`,
    thumbUrl: `/uploads/${subfolder}/${outputThumbFileName}`
  };
};

module.exports = { optimizeAndSaveImage };
