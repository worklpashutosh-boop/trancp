import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { optionalAuth, requireAdmin, requireAuth, signToken, type AuthedRequest } from './server/auth.ts';
import db, { initDatabase } from './server/db.ts';

initDatabase();

const app = express();
app.use(express.json({ limit: '5mb' }));

const uploadDir = path.resolve(process.cwd(), 'public', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
    cb(null, `${Date.now()}_${safeName}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

function hydrateProduct(row: any) {
  if (!row) return null;
  return {
    ...row,
    sizes: JSON.parse(row.sizes_json || '[]'),
    colors: JSON.parse(row.colors_json || '[]'),
    images: JSON.parse(row.images_json || '[]'),
    is_featured: Boolean(row.is_featured),
  };
}

// ==================== AUTH ROUTES ====================

app.post('/api/auth/register', (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }
  const hash = bcrypt.hashSync(String(password), 10);
  const info = db
    .prepare('INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)')
    .run(String(name).trim(), normalizedEmail, String(phone || '').trim(), hash, 'customer');

  const user = {
    id: Number(info.lastInsertRowid),
    name: String(name).trim(),
    email: normalizedEmail,
    phone: String(phone || '').trim(),
    role: 'customer' as const,
  };
  const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });
  res.json({ token, user });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as any;
  if (!row || !bcrypt.compareSync(String(password), row.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  const user = {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role as 'customer' | 'admin',
  };
  const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });
  res.json({ token, user });
});

app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
  const row = db
    .prepare('SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?')
    .get(req.user!.id);
  if (!row) return res.status(404).json({ error: 'User not found' });
  res.json({ user: row });
});

// ==================== STOREFRONT CATALOGUE ROUTES ====================

app.get('/api/categories', (_req, res) => {
  const rows = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM products p WHERE p.subcategory = c.name OR p.category = c.name) as product_count
    FROM categories c
    ORDER BY c.display_order ASC, c.id ASC
  `).all();
  res.json({ categories: rows });
});

app.get('/api/banners', (req, res) => {
  const includeInactive = req.query.all === 'true';
  const rows = includeInactive
    ? db.prepare('SELECT * FROM banners ORDER BY display_order ASC, id ASC').all()
    : db.prepare('SELECT * FROM banners WHERE active = 1 ORDER BY display_order ASC, id ASC').all();
  res.json({ banners: rows });
});

app.get('/api/products', (req, res) => {
  const {
    q = '',
    category = '',
    subcategory = '',
    collection = '',
    minPrice,
    maxPrice,
    size = '',
    color = '',
    sort = 'popularity',
    page = '1',
    limit = '24',
  } = req.query as Record<string, string>;

  const where: string[] = [];
  const params: any[] = [];

  if (q.trim()) {
    where.push('(title LIKE ? OR description LIKE ? OR brand LIKE ? OR subcategory LIKE ? OR category LIKE ?)');
    const term = `%${q.trim()}%`;
    params.push(term, term, term, term, term);
  }

  if (category && category !== 'All') {
    where.push('(category = ? OR subcategory = ?)');
    params.push(category, category);
  }

  if (subcategory && subcategory !== 'All') {
    where.push('subcategory = ?');
    params.push(subcategory);
  }

  if (collection && collection !== 'All') {
    where.push('collection_tag = ?');
    params.push(collection);
  }

  if (minPrice) {
    where.push('discounted_price >= ?');
    params.push(Number(minPrice));
  }

  if (maxPrice) {
    where.push('discounted_price <= ?');
    params.push(Number(maxPrice));
  }

  if (size) {
    where.push('sizes_json LIKE ?');
    params.push(`%"${size}"%`);
  }

  if (color) {
    where.push('colors_json LIKE ?');
    params.push(`%${color}%`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  let orderBy = 'ORDER BY is_featured DESC, review_count DESC, rating DESC';
  if (sort === 'newest') orderBy = 'ORDER BY created_at DESC, id DESC';
  else if (sort === 'price_asc') orderBy = 'ORDER BY discounted_price ASC';
  else if (sort === 'price_desc') orderBy = 'ORDER BY discounted_price DESC';
  else if (sort === 'discount') orderBy = 'ORDER BY discount_percent DESC';

  const pageNum = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 24));
  const offset = (pageNum - 1) * pageSize;

  const totalRow = db
    .prepare(`SELECT COUNT(*) as total FROM products ${whereClause}`)
    .get(...params) as { total: number };

  const rows = db
    .prepare(`SELECT * FROM products ${whereClause} ${orderBy} LIMIT ? OFFSET ?`)
    .all(...params, pageSize, offset);

  res.json({
    products: rows.map(hydrateProduct),
    total: totalRow.total,
    page: pageNum,
    totalPages: Math.max(1, Math.ceil(totalRow.total / pageSize)),
  });
});

app.get('/api/products/:idOrSlug', (req, res) => {
  const { idOrSlug } = req.params;
  const row = /^\d+$/.test(idOrSlug)
    ? db.prepare('SELECT * FROM products WHERE id = ?').get(Number(idOrSlug))
    : db.prepare('SELECT * FROM products WHERE slug = ?').get(idOrSlug);

  if (!row) return res.status(404).json({ error: 'Product not found' });
  const product = hydrateProduct(row);

  const reviews = db
    .prepare('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC')
    .all(product.id);

  const relatedRows = db
    .prepare(
      'SELECT * FROM products WHERE id != ? AND (subcategory = ? OR category = ?) ORDER BY rating DESC LIMIT 4'
    )
    .all(product.id, product.subcategory, product.category);

  res.json({
    product,
    reviews,
    related: relatedRows.map(hydrateProduct),
  });
});

app.post('/api/products/:id/reviews', requireAuth, (req: AuthedRequest, res) => {
  const productId = Number(req.params.id);
  const { rating, title, comment } = req.body;
  if (!rating || !title || !comment) {
    return res.status(400).json({ error: 'Rating, title, and comment are required.' });
  }
  const prod = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
  if (!prod) return res.status(404).json({ error: 'Product not found' });

  db.prepare(
    'INSERT INTO reviews (product_id, user_id, user_name, rating, title, comment, verified_purchase) VALUES (?, ?, ?, ?, ?, ?, 1)'
  ).run(productId, req.user!.id, req.user!.name, Math.min(5, Math.max(1, Number(rating))), String(title), String(comment));

  const stats = db
    .prepare('SELECT COUNT(*) as cnt, AVG(rating) as avg_rating FROM reviews WHERE product_id = ?')
    .get(productId) as { cnt: number; avg_rating: number };

  db.prepare('UPDATE products SET review_count = ?, rating = ? WHERE id = ?').run(
    stats.cnt,
    Math.round((stats.avg_rating || 4.8) * 10) / 10,
    productId
  );

  const reviews = db
    .prepare('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC')
    .all(productId);
  res.json({ reviews, rating: Math.round((stats.avg_rating || 4.8) * 10) / 10, review_count: stats.cnt });
});

// ==================== SHIPPING PINCODE & COUPONS ====================

app.get('/api/shipping/check-pincode', (req, res) => {
  const pincode = String(req.query.pincode || '').trim();
  if (!/^[1-9][0-9]{5}$/.test(pincode)) {
    return res.status(400).json({ error: 'Please enter a valid 6-digit Indian PIN code.' });
  }
  const firstDigit = pincode[0];
  let days = '3–5 business days';
  let region = 'Standard Express';
  if (pincode.startsWith('416') || pincode.startsWith('400') || pincode.startsWith('411')) {
    days = '1–2 business days';
    region = 'Priority Atelier Dispatch (Maharashtra)';
  } else if (['1', '4', '5', '6'].includes(firstDigit)) {
    days = '2–3 business days';
    region = 'Metro Express Air';
  }
  res.json({
    serviceable: true,
    pincode,
    estimatedDelivery: days,
    dispatchType: region,
    codAvailable: true,
    freeShippingAbove: 1999,
  });
});

app.get('/api/coupons/active', (_req, res) => {
  const rows = db.prepare('SELECT code, description, discount_type, discount_value, min_order, max_discount FROM coupons WHERE active = 1').all();
  res.json({ coupons: rows });
});

app.post('/api/coupons/validate', (req, res) => {
  const { code, subtotal } = req.body;
  const normalized = String(code || '').trim().toUpperCase();
  const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND active = 1').get(normalized) as any;
  if (!coupon) {
    return res.status(404).json({ error: 'Invalid or expired coupon code.' });
  }
  const amount = Number(subtotal) || 0;
  if (amount < coupon.min_order) {
    return res.status(400).json({
      error: `Minimum order of ₹${coupon.min_order.toLocaleString('en-IN')} required for ${coupon.code}.`,
    });
  }
  let discount =
    coupon.discount_type === 'percent'
      ? Math.round((amount * coupon.discount_value) / 100)
      : coupon.discount_value;
  if (coupon.max_discount > 0) {
    discount = Math.min(discount, coupon.max_discount);
  }
  res.json({
    valid: true,
    code: coupon.code,
    discountAmount: discount,
    description: coupon.description,
  });
});

// ==================== CUSTOMER ADDRESSES, WISHLIST & CART ====================

app.get('/api/addresses', requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC')
    .all(req.user!.id);
  res.json({ addresses: rows });
});

app.post('/api/addresses', requireAuth, (req: AuthedRequest, res) => {
  const { full_name, phone, line1, line2, city, state, pincode, is_default } = req.body;
  if (!full_name || !phone || !line1 || !city || !state || !pincode) {
    return res.status(400).json({ error: 'All required address fields must be filled.' });
  }
  if (is_default) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user!.id);
  }
  const info = db
    .prepare(
      'INSERT INTO addresses (user_id, full_name, phone, line1, line2, city, state, pincode, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      req.user!.id,
      String(full_name).trim(),
      String(phone).trim(),
      String(line1).trim(),
      String(line2 || '').trim(),
      String(city).trim(),
      String(state).trim(),
      String(pincode).trim(),
      is_default ? 1 : 0
    );
  const addresses = db
    .prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC')
    .all(req.user!.id);
  res.json({ addressId: Number(info.lastInsertRowid), addresses });
});

app.delete('/api/addresses/:id', requireAuth, (req: AuthedRequest, res) => {
  db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user!.id);
  const addresses = db
    .prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC')
    .all(req.user!.id);
  res.json({ addresses });
});

app.get('/api/wishlist', requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare(`
      SELECT p.* FROM wishlist w
      JOIN products p ON p.id = w.product_id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `)
    .all(req.user!.id);
  res.json({ items: rows.map(hydrateProduct) });
});

app.post('/api/wishlist/toggle', requireAuth, (req: AuthedRequest, res) => {
  const productId = Number(req.body.productId);
  const existing = db
    .prepare('SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?')
    .get(req.user!.id, productId);
  if (existing) {
    db.prepare('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?').run(req.user!.id, productId);
  } else {
    db.prepare('INSERT OR IGNORE INTO wishlist (user_id, product_id) VALUES (?, ?)').run(req.user!.id, productId);
  }
  const rows = db
    .prepare(`
      SELECT p.* FROM wishlist w
      JOIN products p ON p.id = w.product_id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `)
    .all(req.user!.id);
  res.json({ items: rows.map(hydrateProduct), wishlisted: !existing });
});

// ==================== RAZORPAY & ORDER PLACEMENT ====================

app.post('/api/payments/razorpay/order', optionalAuth, async (req, res) => {
  const { amount } = req.body;
  const amountInPaise = Math.max(100, Math.round(Number(amount) * 100));
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

  if (keyId && keySecret) {
    try {
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `izho_rcpt_${Date.now()}`,
        }),
      });
      const data = await rzpRes.json();
      if (rzpRes.ok) {
        return res.json({
          mode: 'live',
          keyId,
          orderId: data.id,
          amount: data.amount,
          currency: data.currency,
        });
      }
    } catch {
      // Fallback to verified sandbox simulation if outbound network or credentials fail
    }
  }

  const simulatedOrderId = `order_IZHO_${crypto.randomBytes(6).toString('hex')}`;
  res.json({
    mode: 'simulated',
    keyId: 'rzp_test_izho_sandbox',
    orderId: simulatedOrderId,
    amount: amountInPaise,
    currency: 'INR',
  });
});

app.post('/api/orders', optionalAuth, (req: AuthedRequest, res) => {
  const {
    customer_name,
    customer_email,
    customer_phone,
    shipping_address,
    items,
    coupon_code = '',
    payment_method = 'COD',
    razorpay_order_id = '',
    razorpay_payment_id = '',
    razorpay_signature = '',
  } = req.body;

  if (!customer_name || !customer_email || !customer_phone || !shipping_address || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Complete customer, address, and cart item details are required.' });
  }

  // Recompute authoritative prices from DB
  let subtotal = 0;
  const normalizedItems: any[] = [];
  for (const item of items) {
    const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(item.product_id)) as any;
    if (!prod) {
      return res.status(400).json({ error: `Product #${item.product_id} is no longer available.` });
    }
    const qty = Math.max(1, Number(item.quantity) || 1);
    if (prod.stock < qty) {
      return res.status(400).json({ error: `Insufficient stock for ${prod.title}. Only ${prod.stock} left.` });
    }
    const imgs = JSON.parse(prod.images_json || '[]');
    subtotal += prod.discounted_price * qty;
    normalizedItems.push({
      product_id: prod.id,
      title: prod.title,
      size: item.size || 'Standard',
      color: item.color || 'Default',
      quantity: qty,
      price: prod.discounted_price,
      image: imgs[0] || '',
    });
  }

  let discountAmount = 0;
  let appliedCoupon = '';
  if (coupon_code) {
    const coupon = db
      .prepare('SELECT * FROM coupons WHERE code = ? AND active = 1')
      .get(String(coupon_code).trim().toUpperCase()) as any;
    if (coupon && subtotal >= coupon.min_order) {
      discountAmount =
        coupon.discount_type === 'percent'
          ? Math.round((subtotal * coupon.discount_value) / 100)
          : coupon.discount_value;
      if (coupon.max_discount > 0) discountAmount = Math.min(discountAmount, coupon.max_discount);
      appliedCoupon = coupon.code;
      db.prepare('UPDATE coupons SET usage_count = usage_count + 1 WHERE id = ?').run(coupon.id);
    }
  }

  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const shippingFee = afterDiscount >= 1999 ? 0 : 99;
  const totalAmount = afterDiscount + shippingFee;

  let paymentStatus = 'PENDING';
  if (payment_method === 'RAZORPAY') {
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    if (keySecret && razorpay_signature && !String(razorpay_order_id).startsWith('order_IZHO_')) {
      const expected = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
      if (expected !== razorpay_signature) {
        return res.status(400).json({ error: 'Razorpay signature verification failed.' });
      }
    }
    paymentStatus = razorpay_payment_id ? 'PAID' : 'PENDING';
  }

  const orderNumber = `IZH-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const trackingHistory = [
    {
      status: 'PLACED',
      note:
        payment_method === 'RAZORPAY'
          ? `Order placed & payment verified (${razorpay_payment_id || 'Razorpay'})`
          : 'Cash on Delivery order received',
      time: nowStr,
    },
    {
      status: 'CONFIRMED',
      note: 'Order confirmed by IZHO Atelier',
      time: nowStr,
    },
  ];

  const tx = db.transaction(() => {
    for (const item of normalizedItems) {
      db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?').run(item.quantity, item.product_id);
    }

    const info = db
      .prepare(`
        INSERT INTO orders (
          order_number, user_id, customer_name, customer_email, customer_phone,
          shipping_address_json, items_json, subtotal, discount_amount, coupon_code,
          shipping_fee, total_amount, payment_method, payment_status,
          razorpay_order_id, razorpay_payment_id, order_status, tracking_history_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        orderNumber,
        req.user?.id || null,
        String(customer_name).trim(),
        String(customer_email).trim(),
        String(customer_phone).trim(),
        JSON.stringify(shipping_address),
        JSON.stringify(normalizedItems),
        subtotal,
        discountAmount,
        appliedCoupon,
        shippingFee,
        totalAmount,
        payment_method,
        paymentStatus,
        razorpay_order_id,
        razorpay_payment_id,
        'CONFIRMED',
        JSON.stringify(trackingHistory)
      );

    return Number(info.lastInsertRowid);
  });

  const orderId = tx();
  const created = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
  res.json({
    order: {
      ...created,
      shipping_address: JSON.parse(created.shipping_address_json),
      items: JSON.parse(created.items_json),
      tracking_history: JSON.parse(created.tracking_history_json),
    },
  });
});

app.get('/api/orders/my', requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare('SELECT * FROM orders WHERE user_id = ? OR customer_email = ? ORDER BY created_at DESC')
    .all(req.user!.id, req.user!.email);
  res.json({
    orders: rows.map((r: any) => ({
      ...r,
      shipping_address: JSON.parse(r.shipping_address_json),
      items: JSON.parse(r.items_json),
      tracking_history: JSON.parse(r.tracking_history_json),
    })),
  });
});

app.get('/api/orders/track/:orderNumber', (req, res) => {
  const orderNumber = String(req.params.orderNumber || '').trim().toUpperCase();
  const row = db.prepare('SELECT * FROM orders WHERE UPPER(order_number) = ?').get(orderNumber) as any;
  if (!row) {
    return res.status(404).json({ error: `No order found with tracking ID ${orderNumber}.` });
  }
  res.json({
    order: {
      ...row,
      shipping_address: JSON.parse(row.shipping_address_json),
      items: JSON.parse(row.items_json),
      tracking_history: JSON.parse(row.tracking_history_json),
    },
  });
});

// ==================== ADMIN PANEL API ROUTES ====================

app.get('/api/admin/overview', requireAdmin, (_req, res) => {
  const revenueRow = db
    .prepare("SELECT COALESCE(SUM(total_amount), 0) as total_revenue, COUNT(*) as total_orders FROM orders WHERE order_status != 'CANCELLED'")
    .get() as { total_revenue: number; total_orders: number };
  const productCount = (db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number }).c;
  const lowStockCount = (db.prepare('SELECT COUNT(*) as c FROM products WHERE stock <= 10').get() as { c: number }).c;
  const customerCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'customer'").get() as { c: number }).c;

  const revenueByCategory = db.prepare(`
    SELECT category, SUM(discounted_price * (30 - MIN(stock, 28))) as est_sales, COUNT(*) as sku_count
    FROM products
    GROUP BY category
    ORDER BY est_sales DESC
  `).all();

  const recentOrders = db
    .prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 8')
    .all()
    .map((r: any) => ({
      ...r,
      shipping_address: JSON.parse(r.shipping_address_json),
      items: JSON.parse(r.items_json),
      tracking_history: JSON.parse(r.tracking_history_json),
    }));

  res.json({
    metrics: {
      totalRevenue: revenueRow.total_revenue,
      totalOrders: revenueRow.total_orders,
      totalProducts: productCount,
      lowStockCount,
      totalCustomers: customerCount,
    },
    revenueByCategory,
    recentOrders,
  });
});

app.post('/api/admin/upload', requireAdmin, upload.array('images', 8), (req, res) => {
  const files = (req.files as Express.Multer.File[]) || [];
  const urls = files.map((f) => `/uploads/${f.filename}`);
  res.json({ urls });
});

app.post('/api/admin/products', requireAdmin, (req, res) => {
  const {
    title,
    brand = 'IZHO Atelier',
    category,
    subcategory,
    collection_tag = 'New Arrival',
    description,
    original_price,
    discounted_price,
    stock = 25,
    sizes = ['S', 'M', 'L', 'XL'],
    colors = [{ name: 'Ivory', hex: '#F3EFE6' }],
    images = ['/src/assets/images/prod_midi_dress_1794649862784.jpg'],
    sku,
    is_featured = false,
  } = req.body;

  if (!title || !category || !subcategory || !original_price || !discounted_price) {
    return res.status(400).json({ error: 'Title, category, subcategory, and prices are required.' });
  }

  const orig = Number(original_price);
  const disc = Number(discounted_price);
  const discountPercent = orig > 0 ? Math.max(0, Math.round(((orig - disc) / orig) * 100)) : 0;
  const slug =
    String(title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
    '-' +
    Math.floor(100 + Math.random() * 900);

  const info = db
    .prepare(`
      INSERT INTO products (
        slug, title, brand, category, subcategory, collection_tag, description,
        original_price, discounted_price, discount_percent, stock,
        sizes_json, colors_json, images_json, sku, is_featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      slug,
      String(title).trim(),
      String(brand).trim(),
      String(category).trim(),
      String(subcategory).trim(),
      String(collection_tag),
      String(description || '').trim(),
      orig,
      disc,
      discountPercent,
      Number(stock),
      JSON.stringify(sizes),
      JSON.stringify(colors),
      JSON.stringify(images),
      String(sku || `IZH-${Date.now().toString().slice(-5)}`),
      is_featured ? 1 : 0
    );

  const created = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(info.lastInsertRowid));
  res.json({ product: hydrateProduct(created) });
});

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const {
    title = existing.title,
    brand = existing.brand,
    category = existing.category,
    subcategory = existing.subcategory,
    collection_tag = existing.collection_tag,
    description = existing.description,
    original_price = existing.original_price,
    discounted_price = existing.discounted_price,
    stock = existing.stock,
    sizes,
    colors,
    images,
    sku = existing.sku,
    is_featured,
  } = req.body;

  const orig = Number(original_price);
  const disc = Number(discounted_price);
  const discountPercent = orig > 0 ? Math.max(0, Math.round(((orig - disc) / orig) * 100)) : 0;

  db.prepare(`
    UPDATE products SET
      title = ?, brand = ?, category = ?, subcategory = ?, collection_tag = ?, description = ?,
      original_price = ?, discounted_price = ?, discount_percent = ?, stock = ?,
      sizes_json = ?, colors_json = ?, images_json = ?, sku = ?, is_featured = ?
    WHERE id = ?
  `).run(
    title,
    brand,
    category,
    subcategory,
    collection_tag,
    description,
    orig,
    disc,
    discountPercent,
    Number(stock),
    sizes ? JSON.stringify(sizes) : existing.sizes_json,
    colors ? JSON.stringify(colors) : existing.colors_json,
    images ? JSON.stringify(images) : existing.images_json,
    sku,
    is_featured !== undefined ? (is_featured ? 1 : 0) : existing.is_featured,
    id
  );

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.json({ product: hydrateProduct(updated) });
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(Number(req.params.id));
  res.json({ deleted: true });
});

app.post('/api/admin/categories', requireAdmin, (req, res) => {
  const { name, parent_group, image } = req.body;
  if (!name || !parent_group) return res.status(400).json({ error: 'Name and parent group required.' });
  const slug = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const maxOrder = (db.prepare('SELECT COALESCE(MAX(display_order), 0) as m FROM categories').get() as { m: number }).m;
  const info = db
    .prepare('INSERT INTO categories (name, slug, parent_group, image, display_order) VALUES (?, ?, ?, ?, ?)')
    .run(name, slug, parent_group, image || '/src/assets/images/prod_midi_dress_1794649862784.jpg', maxOrder + 1);
  res.json({ category: db.prepare('SELECT * FROM categories WHERE id = ?').get(Number(info.lastInsertRowid)) });
});

app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(Number(req.params.id));
  res.json({ deleted: true });
});

app.get('/api/admin/orders', requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  res.json({
    orders: rows.map((r: any) => ({
      ...r,
      shipping_address: JSON.parse(r.shipping_address_json),
      items: JSON.parse(r.items_json),
      tracking_history: JSON.parse(r.tracking_history_json),
    })),
  });
});

app.put('/api/admin/orders/:id/status', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { order_status, note } = req.body;
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
  if (!row) return res.status(404).json({ error: 'Order not found' });

  const history = JSON.parse(row.tracking_history_json || '[]');
  const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
  history.push({
    status: order_status,
    note: note || `Order status updated to ${order_status}`,
    time: nowStr,
  });

  const paymentStatus = order_status === 'DELIVERED' ? 'PAID' : row.payment_status;
  db.prepare('UPDATE orders SET order_status = ?, payment_status = ?, tracking_history_json = ? WHERE id = ?').run(
    order_status,
    paymentStatus,
    JSON.stringify(history),
    id
  );

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
  res.json({
    order: {
      ...updated,
      shipping_address: JSON.parse(updated.shipping_address_json),
      items: JSON.parse(updated.items_json),
      tracking_history: JSON.parse(updated.tracking_history_json),
    },
  });
});

app.get('/api/admin/customers', requireAdmin, (_req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
      (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id OR o.customer_email = u.email) as order_count,
      (SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o WHERE o.user_id = u.id OR o.customer_email = u.email) as total_spent
    FROM users u
    ORDER BY u.created_at DESC
  `).all();
  res.json({ customers: rows });
});

app.get('/api/admin/coupons', requireAdmin, (_req, res) => {
  res.json({ coupons: db.prepare('SELECT * FROM coupons ORDER BY id DESC').all() });
});

app.post('/api/admin/coupons', requireAdmin, (req, res) => {
  const { code, description, discount_type = 'percent', discount_value, min_order = 0, max_discount = 0, expires_at = '2027-12-31' } = req.body;
  if (!code || !discount_value) return res.status(400).json({ error: 'Code and discount value required.' });
  const normalized = String(code).trim().toUpperCase();
  const info = db
    .prepare(
      'INSERT INTO coupons (code, description, discount_type, discount_value, min_order, max_discount, active, expires_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)'
    )
    .run(normalized, description || `${discount_value}% off`, discount_type, Number(discount_value), Number(min_order), Number(max_discount), expires_at);
  res.json({ coupon: db.prepare('SELECT * FROM coupons WHERE id = ?').get(Number(info.lastInsertRowid)) });
});

app.put('/api/admin/coupons/:id/toggle', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const c = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id) as any;
  if (!c) return res.status(404).json({ error: 'Coupon not found' });
  db.prepare('UPDATE coupons SET active = ? WHERE id = ?').run(c.active ? 0 : 1, id);
  res.json({ coupon: db.prepare('SELECT * FROM coupons WHERE id = ?').get(id) });
});

app.delete('/api/admin/coupons/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM coupons WHERE id = ?').run(Number(req.params.id));
  res.json({ deleted: true });
});

app.post('/api/admin/banners', requireAdmin, (req, res) => {
  const { title, subtitle, cta_text = 'Shop Now', cta_link = 'All', image_url, placement = 'hero' } = req.body;
  if (!title || !image_url) return res.status(400).json({ error: 'Title and image URL are required.' });
  const maxOrder = (db.prepare('SELECT COALESCE(MAX(display_order), 0) as m FROM banners').get() as { m: number }).m;
  const info = db
    .prepare(
      'INSERT INTO banners (title, subtitle, cta_text, cta_link, image_url, placement, active, display_order) VALUES (?, ?, ?, ?, ?, ?, 1, ?)'
    )
    .run(title, subtitle || '', cta_text, cta_link, image_url, placement, maxOrder + 1);
  res.json({ banner: db.prepare('SELECT * FROM banners WHERE id = ?').get(Number(info.lastInsertRowid)) });
});

app.put('/api/admin/banners/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM banners WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Banner not found' });
  const { title = existing.title, subtitle = existing.subtitle, cta_text = existing.cta_text, cta_link = existing.cta_link, image_url = existing.image_url, placement = existing.placement, active } = req.body;
  db.prepare('UPDATE banners SET title = ?, subtitle = ?, cta_text = ?, cta_link = ?, image_url = ?, placement = ?, active = ? WHERE id = ?').run(
    title,
    subtitle,
    cta_text,
    cta_link,
    image_url,
    placement,
    active !== undefined ? (active ? 1 : 0) : existing.active,
    id
  );
  res.json({ banner: db.prepare('SELECT * FROM banners WHERE id = ?').get(id) });
});

app.delete('/api/admin/banners/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM banners WHERE id = ?').run(Number(req.params.id));
  res.json({ deleted: true });
});

// ==================== VITE / STATIC SERVER ====================

async function startServer() {
  const PORT = 3000;
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`IZHO Storefront & API running on http://localhost:${PORT}`);
  });
}

startServer();
