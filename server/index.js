import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

import { v2 as cloudinary } from 'cloudinary';
import express from 'express';
import multer from 'multer';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const DIST_INDEX_FILE = path.join(DIST_DIR, 'index.html');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const IS_VERCEL = Boolean(process.env.VERCEL);
const DATABASE_URL = process.env.DATABASE_URL?.trim();
const USE_POSTGRES = Boolean(DATABASE_URL);
const DATABASE_SCHEMA = process.env.DATABASE_SCHEMA?.trim() || 'public';
const DATABASE_TABLE = process.env.DATABASE_TABLE?.trim() || 'products';
const CLOUDINARY_URL = process.env.CLOUDINARY_URL?.trim();
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY?.trim();
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET?.trim();
const CLOUDINARY_FOLDER = (process.env.CLOUDINARY_FOLDER?.trim() || 'loja-britt/products').replace(
  /^\/+|\/+$/g,
  '',
);
const USE_CLOUDINARY = Boolean(
  CLOUDINARY_URL || (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET),
);
const STORAGE_PROVIDER = USE_CLOUDINARY ? 'cloudinary' : 'local';
const MAX_IMAGES_PER_PRODUCT = 8;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const { Pool } = pg;
let appReadyPromise;
let frontendServingConfigured = false;
let missingFrontendBuildLogged = false;
let postgresDisplayOrderAvailable = false;

if (USE_CLOUDINARY && !CLOUDINARY_URL) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const DEFAULT_PRODUCTS = [
  {
    id: crypto.randomUUID(),
    name: "T-Shirt Oversized b'ritt",
    displayOrder: 0,
    price: 149.9,
    category: 'Roupas',
    images: ['https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=800'],
    badge: 'Mais vendido',
    description:
      'Camiseta oversized com malha encorpada, estampa frontal minimalista e acabamento premium para o dia a dia.',
    details: ['Modelagem ampla', '100% algodao', 'Drop oficial 2026'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    name: 'Moletom Heavy Tour',
    displayOrder: 1,
    price: 289.9,
    category: 'Roupas',
    images: ['https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800'],
    badge: 'Novo',
    description:
      'Moletom pesado com toque macio, capuz estruturado e arte inspirada na nova fase da turne.',
    details: ['Moletom heavy', 'Forro aconchegante', 'Arte exclusiva'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    name: 'Bone Dad Hat Logo',
    displayOrder: 2,
    price: 89.9,
    category: 'Acessorios',
    images: ['https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&q=80&w=800'],
    badge: '',
    description:
      'Bone ajustavel com bordado frontal e visual limpo para combinar com qualquer look da colecao.',
    details: ['Aba curva', 'Fecho regulavel', 'Bordado frontal'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    name: 'Shoulder Bag Midnight',
    displayOrder: 3,
    price: 119.9,
    category: 'Acessorios',
    images: ['https://images.unsplash.com/photo-1600850056064-a8b380df8395?auto=format&fit=crop&q=80&w=800'],
    badge: '',
    description:
      'Shoulder bag compacta com divisorias internas, visual noturno e acabamento resistente para a rotina.',
    details: ['Compartimentos internos', 'Alca ajustavel', 'Tecido resistente'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    name: "Longsleeve Acid b'ritt",
    displayOrder: 4,
    price: 169.9,
    category: 'Roupas',
    images: ['https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&q=80&w=800'],
    badge: '',
    description:
      'Longsleeve com lavagem acid, caimento reto e arte exclusiva inspirada no universo da nova era.',
    details: ['Lavagem acid', 'Manga longa', 'Arte exclusiva'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    name: "Vinil Duplo 'A Nova Era'",
    displayOrder: 5,
    price: 199.9,
    category: 'Musica',
    images: ['https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=800'],
    badge: 'Limitado',
    description:
      'Vinil duplo colecionavel com encarte especial, arte expandida e prensagem pensada para fas da banda.',
    details: ['Edicao limitada', 'Encarte especial', 'Colecionavel oficial'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function ensureStorage() {
  if (!USE_POSTGRES) {
    if (IS_VERCEL) {
      throw new Error(
        'Na Vercel, configure a DATABASE_URL. O fallback em arquivo local nao funciona em filesystem serverless.',
      );
    }

    await fs.mkdir(DATA_DIR, { recursive: true });
  }

  if (!USE_CLOUDINARY && !IS_VERCEL) {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
}

async function hasProductionBuild() {
  try {
    await fs.access(DIST_INDEX_FILE);
    return true;
  } catch {
    return false;
  }
}

function normalizeImageAsset(image, index = 0) {
  if (!image) return null;

  const rawImage =
    typeof image === 'string'
      ? { url: image }
      : typeof image === 'object'
        ? image
        : null;

  if (!rawImage) return null;

  const url = String(
    rawImage.url ??
      rawImage.secureUrl ??
      rawImage.secure_url ??
      rawImage.src ??
      rawImage.image ??
      '',
  ).trim();

  if (!url) return null;

  const publicId =
    typeof rawImage.publicId === 'string' && rawImage.publicId.trim().length > 0
      ? rawImage.publicId.trim()
      : null;
  const positionX = normalizeImagePosition(rawImage.positionX ?? rawImage.focusX ?? rawImage.x);
  const positionY = normalizeImagePosition(rawImage.positionY ?? rawImage.focusY ?? rawImage.y);
  const storage =
    typeof rawImage.storage === 'string' && rawImage.storage.trim().length > 0
      ? rawImage.storage.trim()
      : publicId
        ? 'cloudinary'
        : isLocalUploadPath(url)
          ? 'local'
          : 'external';

  return {
    id: String(rawImage.id ?? publicId ?? `${storage}-${index}`),
    url,
    publicId,
    storage,
    width: Number(rawImage.width) || null,
    height: Number(rawImage.height) || null,
    bytes: Number(rawImage.bytes) || null,
    format: typeof rawImage.format === 'string' ? rawImage.format.trim() || null : null,
    positionX,
    positionY,
  };
}

function normalizeImagePosition(value) {
  if (value === '' || value === null || value === undefined) {
    return 50;
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return 50;
  }

  return Math.min(100, Math.max(0, Math.round(numericValue)));
}

function normalizeDisplayOrder(value, fallback = 0) {
  const numericValue = Number(value);
  const resolvedValue = Number.isNaN(numericValue) ? fallback : numericValue;
  return Math.max(0, Math.round(resolvedValue));
}

function toComparableTimestamp(value) {
  const timestamp = new Date(value ?? 0).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function compareProductsForDisplay(a, b) {
  const displayOrderDifference =
    normalizeDisplayOrder(a.displayOrder ?? a.display_order, Number.MAX_SAFE_INTEGER)
    - normalizeDisplayOrder(b.displayOrder ?? b.display_order, Number.MAX_SAFE_INTEGER);

  if (displayOrderDifference !== 0) {
    return displayOrderDifference;
  }

  const createdAtDifference =
    toComparableTimestamp(b.createdAt ?? b.created_at) - toComparableTimestamp(a.createdAt ?? a.created_at);

  if (createdAtDifference !== 0) {
    return createdAtDifference;
  }

  return String(a.id ?? '').localeCompare(String(b.id ?? ''));
}

function normalizeProductsCollection(products) {
  return [...products]
    .map((product, index) => normalizeProduct(product, index))
    .sort(compareProductsForDisplay)
    .map((product, index) => ({
      ...product,
      displayOrder: index,
    }));
}

function getProductImageAssets(product) {
  if (Array.isArray(product.imageAssets) && product.imageAssets.length > 0) {
    return product.imageAssets.map(normalizeImageAsset).filter(Boolean);
  }

  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images.map(normalizeImageAsset).filter(Boolean);
  }

  if (product.image) {
    const asset = normalizeImageAsset(product.image);
    return asset ? [asset] : [];
  }

  return [];
}

function normalizeProduct(product, index = 0) {
  const imageAssets = getProductImageAssets(product);
  const images = imageAssets.map((imageAsset) => imageAsset.url);

  return {
    id: product.id ?? crypto.randomUUID(),
    displayOrder: normalizeDisplayOrder(product.displayOrder ?? product.display_order, index),
    name: String(product.name ?? 'Produto sem nome').trim() || 'Produto sem nome',
    price: Math.max(0, Number(product.price) || 0),
    category: String(product.category ?? 'Colecao').trim() || 'Colecao',
    images: images.length > 0 ? images : [],
    imageAssets,
    badge: String(product.badge ?? '').trim(),
    description:
      String(product.description ?? '').trim() || 'Produto oficial da loja com identidade da banda.',
    details:
      Array.isArray(product.details) && product.details.length > 0
        ? product.details.map((detail) => String(detail).trim()).filter(Boolean)
        : ['Produto oficial'],
    createdAt: product.createdAt ?? new Date().toISOString(),
    updatedAt: product.updatedAt ?? new Date().toISOString(),
  };
}

function parseJsonArray(value) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isLocalUploadPath(imagePath) {
  return typeof imagePath === 'string' && imagePath.startsWith('/uploads/');
}

function createExternalImageAsset(imageUrl, index = 0) {
  return normalizeImageAsset(
    {
      id: `external-${index}`,
      url: imageUrl,
      storage: isLocalUploadPath(imageUrl) ? 'local' : 'external',
    },
    index,
  );
}

function parseImageAssets(value) {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed
      .map((item, index) =>
        typeof item === 'string' ? createExternalImageAsset(item, index) : normalizeImageAsset(item, index),
      )
      .filter(Boolean);
  } catch {
    return null;
  }
}

function parseLegacyExistingImageAssets(value) {
  return parseJsonArray(value)
    .map((imageUrl, index) => createExternalImageAsset(imageUrl, index))
    .filter(Boolean);
}

function parseImagePositions(value) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item) => ({
      positionX: normalizeImagePosition(item?.positionX),
      positionY: normalizeImagePosition(item?.positionY),
    }));
  } catch {
    return [];
  }
}

function buildUploadedImageAsset(uploadResult) {
  return normalizeImageAsset({
    id: uploadResult.asset_id ?? uploadResult.public_id,
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    storage: 'cloudinary',
    width: uploadResult.width,
    height: uploadResult.height,
    bytes: uploadResult.bytes,
    format: uploadResult.format,
  });
}

function getImageAssetIdentity(imageAsset) {
  if (!imageAsset) return null;
  if (imageAsset.publicId) return `cloudinary:${imageAsset.publicId}`;
  if (imageAsset.url) return `url:${imageAsset.url}`;
  return null;
}

function getRetainedImageAssets(currentImageAssets, existingImageUrls) {
  const imageAssetByUrl = new Map(
    currentImageAssets
      .filter((imageAsset) => imageAsset?.url)
      .map((imageAsset) => [imageAsset.url, imageAsset]),
  );

  return existingImageUrls
    .map((imageAssetOrUrl, index) => {
      const normalizedImageAsset =
        typeof imageAssetOrUrl === 'string'
          ? createExternalImageAsset(imageAssetOrUrl, index)
          : normalizeImageAsset(imageAssetOrUrl, index);

      if (!normalizedImageAsset) {
        return null;
      }

      const currentImageAsset = imageAssetByUrl.get(normalizedImageAsset.url);
      return currentImageAsset
        ? normalizeImageAsset({ ...currentImageAsset, ...normalizedImageAsset }, index)
        : normalizedImageAsset;
    })
    .filter(Boolean);
}

function applyImagePositions(imageAssets, imagePositions) {
  return imageAssets.map((imageAsset, index) =>
    normalizeImageAsset(
      {
        ...imageAsset,
        ...imagePositions[index],
      },
      index,
    ),
  );
}

function getRemovedImageAssets(previousImageAssets, nextImageAssets) {
  const nextImageIdentities = new Set(
    nextImageAssets.map((imageAsset) => getImageAssetIdentity(imageAsset)).filter(Boolean),
  );

  return previousImageAssets.filter((imageAsset) => {
    const imageIdentity = getImageAssetIdentity(imageAsset);
    return imageIdentity && !nextImageIdentities.has(imageIdentity);
  });
}

async function saveFileLocally(file) {
  const extension = path.extname(file.originalname) || '.jpg';
  const fileName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const absolutePath = path.join(UPLOADS_DIR, fileName);

  await fs.writeFile(absolutePath, file.buffer);

  return normalizeImageAsset({
    id: fileName,
    url: `/uploads/${fileName}`,
    storage: 'local',
  });
}

async function uploadFileToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: CLOUDINARY_FOLDER || undefined,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result) {
          reject(new Error('Cloudinary nao retornou dados da imagem enviada.'));
          return;
        }

        resolve(buildUploadedImageAsset(result));
      },
    );

    Readable.from(file.buffer).pipe(uploadStream);
  });
}

async function uploadIncomingImages(files) {
  if (files.length > 0 && !USE_CLOUDINARY && IS_VERCEL) {
    throw new Error(
      'Na Vercel, configure a CLOUDINARY_URL para uploads. O filesystem local nao persiste entre execucoes.',
    );
  }

  const uploadedImageAssets = [];

  try {
    for (const file of files) {
      const uploadedImageAsset = USE_CLOUDINARY
        ? await uploadFileToCloudinary(file)
        : await saveFileLocally(file);

      uploadedImageAssets.push(uploadedImageAsset);
    }

    return uploadedImageAssets;
  } catch (error) {
    await safeDeleteImageAssets(uploadedImageAssets);
    throw error;
  }
}

async function deleteImageAssets(imageAssets) {
  const assetsToDelete = imageAssets.filter(Boolean);

  await Promise.all(
    assetsToDelete.map(async (imageAsset) => {
      if (imageAsset.storage === 'cloudinary' && imageAsset.publicId) {
        await cloudinary.uploader.destroy(imageAsset.publicId, {
          resource_type: 'image',
          invalidate: true,
        });
        return;
      }

      if (!imageAsset.url || !isLocalUploadPath(imageAsset.url)) {
        return;
      }

      const absolutePath = path.join(UPLOADS_DIR, path.basename(imageAsset.url));
      try {
        await fs.unlink(absolutePath);
      } catch {
        // Ignore missing files.
      }
    }),
  );
}

async function safeDeleteImageAssets(imageAssets) {
  try {
    await deleteImageAssets(imageAssets);
  } catch (error) {
    console.error(`Nao foi possivel limpar imagens antigas do storage ${STORAGE_PROVIDER}: ${error.message}`);
  }
}

let db;
let pool;

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function sanitizeDatabaseUrl(value) {
  if (!value) return value;

  try {
    const parsedUrl = new URL(value);
    parsedUrl.searchParams.delete('sslmode');
    return parsedUrl.toString();
  } catch {
    return value;
  }
}

function getProductsTableRef() {
  return `${quoteIdentifier(DATABASE_SCHEMA)}.${quoteIdentifier(DATABASE_TABLE)}`;
}

function getPostgresProductsSelectClause() {
  return `
    id,
    name,
    price::float8 AS price,
    category,
    images,
    ${postgresDisplayOrderAvailable ? 'display_order AS "displayOrder",' : ''}
    badge,
    description,
    details,
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  `;
}

function getPostgresProductsOrderByClause() {
  return postgresDisplayOrderAvailable
    ? 'ORDER BY display_order ASC, created_at DESC, id ASC'
    : 'ORDER BY created_at DESC, id ASC';
}

async function doesProductsTableExist() {
  const result = await pool.query('SELECT to_regclass($1) AS table_name', [
    `${DATABASE_SCHEMA}.${DATABASE_TABLE}`,
  ]);

  return Boolean(result.rows[0]?.table_name);
}

async function doesProductsColumnExist(columnName) {
  const result = await pool.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = $1
          AND table_name = $2
          AND column_name = $3
      ) AS exists
    `,
    [DATABASE_SCHEMA, DATABASE_TABLE, columnName],
  );

  return Boolean(result.rows[0]?.exists);
}

async function compactPostgresDisplayOrder(client = pool) {
  const productsTableRef = getProductsTableRef();

  await client.query(`
    WITH ordered_products AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          ORDER BY COALESCE(display_order, 2147483647), created_at DESC, id ASC
        ) - 1 AS next_display_order
      FROM ${productsTableRef}
    )
    UPDATE ${productsTableRef} AS products
    SET display_order = ordered_products.next_display_order
    FROM ordered_products
    WHERE products.id = ordered_products.id
      AND products.display_order IS DISTINCT FROM ordered_products.next_display_order
  `);
}

async function ensureProductsTable() {
  const productsTableRef = getProductsTableRef();

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${productsTableRef} (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        category TEXT NOT NULL,
        images JSONB NOT NULL DEFAULT '[]'::jsonb,
        display_order INTEGER NOT NULL DEFAULT 0,
        badge TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL,
        details JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  } catch (error) {
    if (!/permission denied for schema/i.test(error.message)) {
      throw error;
    }

    const tableExists = await doesProductsTableExist();
    if (!tableExists) {
      throw error;
    }
  }
}

async function ensureProductsDisplayOrderColumn() {
  const productsTableRef = getProductsTableRef();

  if (await doesProductsColumnExist('display_order')) {
    postgresDisplayOrderAvailable = true;
    await compactPostgresDisplayOrder();
    return;
  }

  try {
    await pool.query(`ALTER TABLE ${productsTableRef} ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0`);
    postgresDisplayOrderAvailable = true;
    await compactPostgresDisplayOrder();
  } catch (error) {
    if (/already exists/i.test(error.message)) {
      postgresDisplayOrderAvailable = true;
      await compactPostgresDisplayOrder();
      return;
    }

    if (/permission denied|must be owner of table/i.test(error.message)) {
      postgresDisplayOrderAvailable = false;
      console.warn(
        `Nao foi possivel criar a coluna display_order em ${DATABASE_SCHEMA}.${DATABASE_TABLE}. A API vai seguir em modo legado ate a migracao ser aplicada por um owner da tabela.`,
      );
      return;
    }

    throw error;
  }
}

function formatStartupError(error) {
  const lines = ['Falha ao iniciar o servidor da loja.'];

  if (IS_VERCEL) {
    lines.push('Ambiente detectado: Vercel.');
  }

  if (USE_POSTGRES) {
    lines.push(
      `Banco configurado: Postgres (${DATABASE_SCHEMA}.${DATABASE_TABLE}) usando a DATABASE_URL atual.`,
    );

    if (/permission denied for schema/i.test(error.message)) {
      lines.push(
        `A role dessa conexao nao pode criar a tabela em "${DATABASE_SCHEMA}". Use uma role dona do banco/schema ou rode o script "server/sql/neon-products.sql" no SQL Editor da Neon com uma role administradora.`,
      );
    } else {
      lines.push('Confira a DATABASE_URL e se a tabela configurada existe e esta acessivel.');
    }
  } else {
    lines.push('O fallback em arquivo local tambem nao conseguiu iniciar.');

    if (IS_VERCEL) {
      lines.push('Na Vercel, configure a DATABASE_URL para persistir os produtos.');
    }
  }

  if (IS_VERCEL && !USE_CLOUDINARY) {
    lines.push('Para uploads de imagens na Vercel, configure a CLOUDINARY_URL.');
  }

  lines.push(`Detalhe tecnico: ${error.message}`);
  return lines.join('\n');
}

function createPool() {
  const sanitizedDatabaseUrl = sanitizeDatabaseUrl(DATABASE_URL);
  const isRemoteDatabase =
    sanitizedDatabaseUrl &&
    !sanitizedDatabaseUrl.includes('localhost') &&
    !sanitizedDatabaseUrl.includes('127.0.0.1');

  return new Pool({
    connectionString: sanitizedDatabaseUrl,
    ssl: isRemoteDatabase ? { rejectUnauthorized: false } : undefined,
  });
}

async function initializeStore() {
  await ensureStorage();

  if (USE_POSTGRES) {
    const productsTableRef = getProductsTableRef();
    pool = createPool();

    await ensureProductsTable();
    await ensureProductsDisplayOrderColumn();

    const countResult = await pool.query(`SELECT COUNT(*)::int AS count FROM ${productsTableRef}`);
    if ((countResult.rows[0]?.count ?? 0) === 0) {
      for (const product of DEFAULT_PRODUCTS.map(normalizeProduct)) {
        await pool.query(
          `
            INSERT INTO ${productsTableRef}
              (id, name, price, category, images, display_order, badge, description, details, created_at, updated_at)
            VALUES
              ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9::jsonb, $10, $11)
          `,
          [
            product.id,
            product.name,
            product.price,
            product.category,
            JSON.stringify(product.imageAssets),
            product.displayOrder,
            product.badge,
            product.description,
            JSON.stringify(product.details),
            product.createdAt,
            product.updatedAt,
          ],
        );
      }
    }

    return;
  }

  const adapter = new JSONFile(DB_FILE);
  db = new Low(adapter, { products: DEFAULT_PRODUCTS });

  await db.read();
  db.data ||= { products: DEFAULT_PRODUCTS };
  db.data.products = Array.isArray(db.data.products) && db.data.products.length > 0
    ? normalizeProductsCollection(db.data.products)
    : normalizeProductsCollection(DEFAULT_PRODUCTS);
  await db.write();
}

async function listProducts() {
  if (USE_POSTGRES) {
    const productsTableRef = getProductsTableRef();
    const result = await pool.query(`
      SELECT
        ${getPostgresProductsSelectClause()}
      FROM ${productsTableRef}
      ${getPostgresProductsOrderByClause()}
    `);

    return result.rows.map((product, index) => normalizeProduct(product, index));
  }

  await db.read();
  return normalizeProductsCollection(db.data.products);
}

async function getProductById(productId) {
  if (USE_POSTGRES) {
    const productsTableRef = getProductsTableRef();
    const result = await pool.query(
      `
        SELECT
          ${getPostgresProductsSelectClause()}
        FROM ${productsTableRef}
        WHERE id = $1
      `,
      [productId],
    );

    return result.rows[0] ? normalizeProduct(result.rows[0]) : null;
  }

  await db.read();
  const product = db.data.products.find((item) => item.id === productId);
  return product ? normalizeProduct(product) : null;
}

async function createProductRecord(product) {
  if (USE_POSTGRES) {
    const productsTableRef = getProductsTableRef();
    if (postgresDisplayOrderAvailable) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');
        await client.query(`UPDATE ${productsTableRef} SET display_order = COALESCE(display_order, 0) + 1`);

        const result = await client.query(
          `
            INSERT INTO ${productsTableRef}
              (id, name, price, category, images, display_order, badge, description, details, created_at, updated_at)
            VALUES
              ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9::jsonb, $10, $11)
            RETURNING
              ${getPostgresProductsSelectClause()}
          `,
          [
            product.id,
            product.name,
            product.price,
            product.category,
            JSON.stringify(product.imageAssets),
            0,
            product.badge,
            product.description,
            JSON.stringify(product.details),
            product.createdAt,
            product.updatedAt,
          ],
        );

        await client.query('COMMIT');
        return normalizeProduct(result.rows[0]);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    const result = await pool.query(
      `
        INSERT INTO ${productsTableRef}
          (id, name, price, category, images, badge, description, details, created_at, updated_at)
        VALUES
          ($1, $2, $3, $4, $5::jsonb, $6, $7, $8::jsonb, $9, $10)
        RETURNING
          ${getPostgresProductsSelectClause()}
      `,
      [
        product.id,
        product.name,
        product.price,
        product.category,
        JSON.stringify(product.imageAssets),
        product.badge,
        product.description,
        JSON.stringify(product.details),
        product.createdAt,
        product.updatedAt,
      ],
    );

    return normalizeProduct(
      {
        ...result.rows[0],
        displayOrder: 0,
      },
      0,
    );
  }

  await db.read();
  db.data.products = normalizeProductsCollection([
    {
      ...product,
      displayOrder: 0,
    },
    ...db.data.products,
  ]);
  await db.write();
  return normalizeProduct(db.data.products.find((item) => item.id === product.id) ?? product);
}

async function updateProductRecord(productId, product) {
  if (USE_POSTGRES) {
    const productsTableRef = getProductsTableRef();
    if (postgresDisplayOrderAvailable) {
      const result = await pool.query(
        `
          UPDATE ${productsTableRef}
          SET
            name = $2,
            price = $3,
            category = $4,
            images = $5::jsonb,
            display_order = $6,
            badge = $7,
            description = $8,
            details = $9::jsonb,
            updated_at = $10
          WHERE id = $1
          RETURNING
            ${getPostgresProductsSelectClause()}
        `,
        [
          productId,
          product.name,
          product.price,
          product.category,
          JSON.stringify(product.imageAssets),
          product.displayOrder,
          product.badge,
          product.description,
          JSON.stringify(product.details),
          product.updatedAt,
        ],
      );

      return result.rows[0] ? normalizeProduct(result.rows[0]) : null;
    }

    const result = await pool.query(
      `
        UPDATE ${productsTableRef}
        SET
          name = $2,
          price = $3,
          category = $4,
          images = $5::jsonb,
          badge = $6,
          description = $7,
          details = $8::jsonb,
          updated_at = $9
        WHERE id = $1
        RETURNING
          ${getPostgresProductsSelectClause()}
      `,
      [
        productId,
        product.name,
        product.price,
        product.category,
        JSON.stringify(product.imageAssets),
        product.badge,
        product.description,
        JSON.stringify(product.details),
        product.updatedAt,
      ],
    );

    return result.rows[0]
      ? normalizeProduct(
          {
            ...result.rows[0],
            displayOrder: product.displayOrder,
          },
          product.displayOrder,
        )
      : null;
  }

  await db.read();
  const productIndex = db.data.products.findIndex((item) => item.id === productId);
  if (productIndex === -1) {
    return null;
  }

  db.data.products[productIndex] = product;
  db.data.products = normalizeProductsCollection(db.data.products);
  await db.write();
  return normalizeProduct(db.data.products.find((item) => item.id === productId) ?? product);
}

async function deleteProductRecord(productId) {
  if (USE_POSTGRES) {
    const productsTableRef = getProductsTableRef();
    if (postgresDisplayOrderAvailable) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const result = await client.query(
          `
            DELETE FROM ${productsTableRef}
            WHERE id = $1
            RETURNING
              ${getPostgresProductsSelectClause()}
          `,
          [productId],
        );

        if (result.rows[0]) {
          await compactPostgresDisplayOrder(client);
        }

        await client.query('COMMIT');
        return result.rows[0] ? normalizeProduct(result.rows[0]) : null;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    const result = await pool.query(
      `
        DELETE FROM ${productsTableRef}
        WHERE id = $1
        RETURNING
          ${getPostgresProductsSelectClause()}
      `,
      [productId],
    );

    return result.rows[0] ? normalizeProduct(result.rows[0]) : null;
  }

  await db.read();
  const productIndex = db.data.products.findIndex((item) => item.id === productId);
  if (productIndex === -1) {
    return null;
  }

  const [removedProduct] = db.data.products.splice(productIndex, 1);
  db.data.products = normalizeProductsCollection(db.data.products);
  await db.write();
  return normalizeProduct(removedProduct);
}

async function reorderProductRecords(productIds) {
  if (USE_POSTGRES && !postgresDisplayOrderAvailable) {
    const error = new Error(
      'A tabela atual ainda nao tem a coluna display_order. Rode a migracao com um owner do banco para liberar a reordenacao.',
    );
    error.statusCode = 409;
    throw error;
  }

  const normalizedProductIds = [...new Set(productIds.map((productId) => String(productId).trim()).filter(Boolean))];

  if (normalizedProductIds.length === 0) {
    const error = new Error('Envie a lista completa de produtos para salvar a ordem de exibicao.');
    error.statusCode = 400;
    throw error;
  }

  if (USE_POSTGRES) {
    const productsTableRef = getProductsTableRef();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const existingProducts = await client.query(`SELECT id FROM ${productsTableRef}`);
      const existingIds = existingProducts.rows.map((row) => row.id);

      if (
        normalizedProductIds.length !== existingIds.length
        || normalizedProductIds.some((productId) => !existingIds.includes(productId))
      ) {
        const error = new Error('A ordem de exibicao precisa incluir todos os produtos atuais.');
        error.statusCode = 400;
        throw error;
      }

      const updateValues = normalizedProductIds
        .map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2})`)
        .join(', ');
      const updateParams = normalizedProductIds.flatMap((productId, index) => [productId, index]);

      await client.query(
        `
          UPDATE ${productsTableRef} AS products
          SET display_order = ordered_products.display_order
          FROM (VALUES ${updateValues}) AS ordered_products(id, display_order)
          WHERE products.id = ordered_products.id
        `,
        updateParams,
      );

      await client.query('COMMIT');
      return listProducts();
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  await db.read();

  const existingProducts = normalizeProductsCollection(db.data.products);
  const productsById = new Map(existingProducts.map((product) => [product.id, product]));

  if (
    normalizedProductIds.length !== existingProducts.length
    || normalizedProductIds.some((productId) => !productsById.has(productId))
  ) {
    const error = new Error('A ordem de exibicao precisa incluir todos os produtos atuais.');
    error.statusCode = 400;
    throw error;
  }

  db.data.products = normalizedProductIds.map((productId, index) =>
    normalizeProduct(
      {
        ...productsById.get(productId),
        displayOrder: index,
      },
      index,
    ),
  );
  await db.write();
  return db.data.products.map(normalizeProduct);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: MAX_IMAGES_PER_PRODUCT,
    fileSize: MAX_IMAGE_SIZE,
  },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      callback(new Error('Apenas imagens sao permitidas.'));
      return;
    }

    callback(null, true);
  },
});

const app = express();
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(async (_req, _res, next) => {
  try {
    await ensureAppReady();
    next();
  } catch (error) {
    error.statusCode = error.statusCode ?? 500;
    next(error);
  }
});

app.get('/api/health', async (_req, res) => {
  const buildReady = await hasProductionBuild();

  res.json({
    status: 'ok',
    database: USE_POSTGRES ? 'postgres' : 'file',
    table: `${DATABASE_SCHEMA}.${DATABASE_TABLE}`,
    storage: STORAGE_PROVIDER,
    frontend: IS_VERCEL ? 'vercel-static' : buildReady ? 'embedded' : 'api-only',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/products', async (_req, res) => {
  const products = await listProducts();
  res.json(products);
});

app.post('/api/products', upload.array('images', MAX_IMAGES_PER_PRODUCT), async (req, res) => {
  const existingImageAssets = parseImageAssets(req.body.existingImageAssets)
    ?? parseLegacyExistingImageAssets(req.body.existingImages);
  const uploadedImageAssets = applyImagePositions(
    await uploadIncomingImages(req.files ?? []),
    parseImagePositions(req.body.newImagePositions),
  );
  const details = parseJsonArray(req.body.details);

  try {
    const product = normalizeProduct({
      id: crypto.randomUUID(),
      name: req.body.name,
      price: req.body.price,
      category: req.body.category,
      badge: req.body.badge,
      description: req.body.description,
      details,
      images: [...existingImageAssets, ...uploadedImageAssets],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const createdProduct = await createProductRecord(product);
    res.status(201).json(createdProduct);
  } catch (error) {
    await safeDeleteImageAssets(uploadedImageAssets);
    throw error;
  }
});

app.patch('/api/products/reorder', async (req, res) => {
  const productIds = Array.isArray(req.body?.productIds) ? req.body.productIds : [];
  const reorderedProducts = await reorderProductRecords(productIds);
  res.json(reorderedProducts);
});

app.put('/api/products/:id', upload.array('images', MAX_IMAGES_PER_PRODUCT), async (req, res) => {
  const currentProduct = await getProductById(req.params.id);
  if (!currentProduct) {
    res.status(404).json({ message: 'Produto nao encontrado.' });
    return;
  }

  const submittedImageAssets = parseImageAssets(req.body.existingImageAssets)
    ?? parseLegacyExistingImageAssets(req.body.existingImages);
  const retainedImageAssets = getRetainedImageAssets(currentProduct.imageAssets, submittedImageAssets);
  const uploadedImageAssets = applyImagePositions(
    await uploadIncomingImages(req.files ?? []),
    parseImagePositions(req.body.newImagePositions),
  );
  const details = parseJsonArray(req.body.details);

  try {
    const updatedProduct = normalizeProduct({
      ...currentProduct,
      name: req.body.name,
      price: req.body.price,
      category: req.body.category,
      badge: req.body.badge,
      description: req.body.description,
      details,
      images: [...retainedImageAssets, ...uploadedImageAssets],
      updatedAt: new Date().toISOString(),
    });

    const savedProduct = await updateProductRecord(req.params.id, updatedProduct);
    const removedImageAssets = getRemovedImageAssets(currentProduct.imageAssets, updatedProduct.imageAssets);
    await safeDeleteImageAssets(removedImageAssets);
    res.json(savedProduct);
  } catch (error) {
    await safeDeleteImageAssets(uploadedImageAssets);
    throw error;
  }
});

app.delete('/api/products/:id', async (req, res) => {
  const removedProduct = await deleteProductRecord(req.params.id);
  if (!removedProduct) {
    res.status(204).end();
    return;
  }

  await safeDeleteImageAssets(removedProduct.imageAssets);

  res.status(204).end();
});

app.use((error, _req, res, _next) => {
  const statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : error.statusCode ?? 400;
  res.status(statusCode).json({ message: error.message || 'Erro interno do servidor.' });
});

const port = Number(process.env.PORT) || 3001;

function ensureAppReady() {
  if (!appReadyPromise) {
    appReadyPromise = initializeStore().catch((error) => {
      appReadyPromise = null;
      throw error;
    });
  }

  return appReadyPromise;
}

async function ensureFrontendServing() {
  if (frontendServingConfigured) {
    return;
  }

  const buildReady = await hasProductionBuild();
  if (!buildReady) {
    if (!missingFrontendBuildLogged) {
      console.log(
        'Build do frontend nao encontrado. A API vai subir em modo API-only ate voce rodar "npm run build".',
      );
      missingFrontendBuildLogged = true;
    }

    return;
  }

  app.use(express.static(DIST_DIR));
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
    res.sendFile(DIST_INDEX_FILE);
  });
  frontendServingConfigured = true;
}

async function startServer() {
  try {
    await ensureAppReady();
    await ensureFrontendServing();

    app.listen(port, '0.0.0.0', () => {
      console.log(
        `Servidor da loja rodando em http://localhost:${port} usando ${USE_POSTGRES ? 'Neon/Postgres' : 'arquivo local'} em ${DATABASE_SCHEMA}.${DATABASE_TABLE} com imagens no ${STORAGE_PROVIDER}`,
      );
    });
  } catch (error) {
    console.error(formatStartupError(error));
    process.exit(1);
  }
}

const isMainModule = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === __filename;

export { ensureAppReady, startServer };
export default app;

if (isMainModule) {
  await startServer();
}
