import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'izho.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT DEFAULT '',
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      parent_group TEXT NOT NULL,
      image TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      brand TEXT NOT NULL DEFAULT 'IZHO Atelier',
      category TEXT NOT NULL,
      subcategory TEXT NOT NULL,
      collection_tag TEXT NOT NULL DEFAULT 'New Arrival',
      description TEXT NOT NULL,
      original_price INTEGER NOT NULL,
      discounted_price INTEGER NOT NULL,
      discount_percent INTEGER NOT NULL,
      stock INTEGER NOT NULL DEFAULT 25,
      sizes_json TEXT NOT NULL DEFAULT '[]',
      colors_json TEXT NOT NULL DEFAULT '[]',
      images_json TEXT NOT NULL DEFAULT '[]',
      rating REAL NOT NULL DEFAULT 4.8,
      review_count INTEGER NOT NULL DEFAULT 0,
      sku TEXT NOT NULL,
      is_featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(subcategory);
    CREATE INDEX IF NOT EXISTS idx_products_collection ON products(collection_tag);
    CREATE INDEX IF NOT EXISTS idx_products_price ON products(discounted_price);
    CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at DESC);

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_id INTEGER,
      user_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      title TEXT NOT NULL,
      comment TEXT NOT NULL,
      verified_purchase INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      line1 TEXT NOT NULL,
      line2 TEXT DEFAULT '',
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      pincode TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wishlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      size TEXT NOT NULL,
      color TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, product_id, size, color),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      discount_type TEXT NOT NULL DEFAULT 'percent',
      discount_value INTEGER NOT NULL,
      min_order INTEGER NOT NULL DEFAULT 0,
      max_discount INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      usage_count INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      cta_text TEXT NOT NULL,
      cta_link TEXT NOT NULL,
      image_url TEXT NOT NULL,
      placement TEXT NOT NULL DEFAULT 'hero',
      active INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      shipping_address_json TEXT NOT NULL,
      items_json TEXT NOT NULL,
      subtotal INTEGER NOT NULL,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      coupon_code TEXT DEFAULT '',
      shipping_fee INTEGER NOT NULL DEFAULT 0,
      total_amount INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'PENDING',
      razorpay_order_id TEXT DEFAULT '',
      razorpay_payment_id TEXT DEFAULT '',
      order_status TEXT NOT NULL DEFAULT 'PLACED',
      tracking_history_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
  `);

  seedInitialData();
}

function seedInitialData() {
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (userCount === 0) {
    const adminHash = bcrypt.hashSync('IzhoAdmin@2026', 10);
    const customerHash = bcrypt.hashSync('Customer@2026', 10);

    const insertUser = db.prepare(
      'INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)'
    );
    insertUser.run('IZHO Store Owner', 'kolhapurpan1@gmail.com', '8788632212', adminHash, 'admin');
    const custInfo = insertUser.run('Ananya Deshmukh', 'ananya@izho.in', '9820144510', customerHash, 'customer');

    db.prepare(
      'INSERT INTO addresses (user_id, full_name, phone, line1, line2, city, state, pincode, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      custInfo.lastInsertRowid,
      'Ananya Deshmukh',
      '9820144510',
      '14 Rosewood Enclave, Rajarampuri 3rd Lane',
      'Near Mahalaxmi Chambers',
      'Kolhapur',
      'Maharashtra',
      '416008',
      1
    );
  }

  const catCount = (db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number }).c;
  if (catCount === 0) {
    const insertCat = db.prepare(
      'INSERT INTO categories (name, slug, parent_group, image, display_order) VALUES (?, ?, ?, ?, ?)'
    );
    const categories = [
      ['Sarees', 'sarees', 'Women', '/src/assets/images/prod_silk_saree_1794649861702.jpg', 1],
      ['Kurtis', 'kurtis', 'Women', '/src/assets/images/prod_embroidered_kurti_1794649862676.jpg', 2],
      ['Dresses', 'dresses', 'Women', '/src/assets/images/prod_midi_dress_1794649862784.jpg', 3],
      ["Women's Clothing", 'womens-clothing', 'Women', '/src/assets/images/prod_womens_blazer_1794649862786.jpg', 4],
      ["Men's Clothing", 'mens-clothing', 'Men', '/src/assets/images/prod_mens_linen_shirt_1794649863758.jpg', 5],
      ['Kids Fashion', 'kids-fashion', 'Kids', '/src/assets/images/prod_kids_ethnic_1794649864293.jpg', 6],
      ['Beauty Products', 'beauty-products', 'Beauty', '/src/assets/images/prod_beauty_serum_1794649864797.jpg', 7],
      ['Shoes', 'shoes', 'Footwear', '/src/assets/images/prod_leather_heels_1794649865546.jpg', 8],
      ['Sneakers', 'sneakers', 'Footwear', '/src/assets/images/prod_minimal_sneakers_1794649865013.jpg', 9],
      ['Jewellery', 'jewellery', 'Jewellery', '/src/assets/images/prod_kundan_jewellery_1794649866494.jpg', 10],
      ['Watches', 'watches', 'Accessories', '/src/assets/images/prod_chronograph_watch_1794649867115.jpg', 11],
      ['Handbags', 'handbags', 'Accessories', '/src/assets/images/prod_leather_handbag_1794649866987.jpg', 12],
      ['Home & Living', 'home-living', 'Home & Living', '/src/assets/images/prod_home_linen_1794649867501.jpg', 13],
    ];
    for (const c of categories) {
      insertCat.run(...c);
    }
  }

  const prodCount = (db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number }).c;
  if (prodCount === 0) {
    const insertProd = db.prepare(`
      INSERT INTO products (
        slug, title, brand, category, subcategory, collection_tag, description,
        original_price, discounted_price, discount_percent, stock,
        sizes_json, colors_json, images_json, rating, review_count, sku, is_featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seedProducts = [
      {
        slug: 'rosegold-banarasi-katan-silk-saree',
        title: 'Rosewood Katan Banarasi Silk Saree',
        brand: 'IZHO Heritage',
        category: 'Women',
        subcategory: 'Sarees',
        collection_tag: 'Exclusive',
        description:
          'Handwoven in pure mulberry katan silk with antique gold zari kadhua motifs and scalloped tasselled pallu. Includes an unstitched 0.9m silk brocade blouse piece crafted for weddings and milestone evenings.',
        original_price: 18990,
        discounted_price: 13290,
        discount_percent: 30,
        stock: 18,
        sizes: ['Free Size (6.3m)'],
        colors: [
          { name: 'Dusty Rose', hex: '#B4797D' },
          { name: 'Champagne Ivory', hex: '#EAE0D5' },
          { name: 'Antique Mauve', hex: '#8F6A71' },
        ],
        images: [
          '/src/assets/images/prod_silk_saree_1794649861702.jpg',
          '/src/assets/images/promo_festive_silk_1794649861982.jpg',
          '/src/assets/images/hero_izho_atelier_1794649860908.jpg',
        ],
        rating: 4.9,
        review_count: 142,
        sku: 'IZH-SAR-101',
        is_featured: 1,
      },
      {
        slug: 'ivory-chanderi-chikankari-kurti-set',
        title: 'Ivory Chanderi Chikankari 3-Piece Kurti Set',
        brand: 'IZHO Looms',
        category: 'Women',
        subcategory: 'Kurtis',
        collection_tag: 'Best Seller',
        description:
          'Breathable handloom Chanderi silk-cotton straight kurti adorned with delicate shadow-work chikankari embroidery, paired with tailored cigarette trousers and a scalloped sheer organza dupatta.',
        original_price: 7490,
        discounted_price: 5240,
        discount_percent: 30,
        stock: 34,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: [
          { name: 'Porcelain Ivory', hex: '#F4EFE6' },
          { name: 'Blush Mist', hex: '#EED6D3' },
        ],
        images: [
          '/src/assets/images/prod_embroidered_kurti_1794649862676.jpg',
          '/src/assets/images/promo_festive_silk_1794649861982.jpg',
          '/src/assets/images/prod_kundan_jewellery_1794649866494.jpg',
        ],
        rating: 4.8,
        review_count: 218,
        sku: 'IZH-KUR-102',
        is_featured: 1,
      },
      {
        slug: 'champagne-pleated-satin-midi-wrap-dress',
        title: 'Champagne Pleated Satin Midi Wrap Dress',
        brand: 'IZHO Atelier',
        category: 'Women',
        subcategory: 'Dresses',
        collection_tag: 'Trending',
        description:
          'Fluid Japanese-weave crepe satin silhouette featuring a sculpted surplice neckline, detachable waist sash, and razor-sharp knife pleats that catch evening light effortlessly.',
        original_price: 8990,
        discounted_price: 6290,
        discount_percent: 30,
        stock: 26,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: [
          { name: 'Champagne Blush', hex: '#DFC5B5' },
          { name: 'Espresso Noir', hex: '#2B2424' },
        ],
        images: [
          '/src/assets/images/prod_midi_dress_1794649862784.jpg',
          '/src/assets/images/prod_leather_heels_1794649865546.jpg',
          '/src/assets/images/prod_leather_handbag_1794649866987.jpg',
        ],
        rating: 4.9,
        review_count: 164,
        sku: 'IZH-DRS-103',
        is_featured: 1,
      },
      {
        slug: 'sand-linen-double-breasted-blazer-set',
        title: 'Sand Linen Double-Breasted Tailored Suit',
        brand: 'IZHO Studio',
        category: 'Women',
        subcategory: "Women's Clothing",
        collection_tag: 'New Arrival',
        description:
          'Architectural European flax-linen blend blazer with tortoiseshell buttons, structured peak lapels, and matching high-waisted wide-leg trousers lined in breathable cupro.',
        original_price: 12990,
        discounted_price: 9740,
        discount_percent: 25,
        stock: 20,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: [
          { name: 'Warm Sand', hex: '#D8C7B2' },
          { name: 'Ivory Cream', hex: '#EFECE6' },
        ],
        images: [
          '/src/assets/images/prod_womens_blazer_1794649862786.jpg',
          '/src/assets/images/hero_izho_atelier_1794649860908.jpg',
          '/src/assets/images/prod_leather_handbag_1794649866987.jpg',
        ],
        rating: 4.7,
        review_count: 89,
        sku: 'IZH-WCL-104',
        is_featured: 1,
      },
      {
        slug: 'sage-italian-linen-mandarin-shirt',
        title: 'Sage Pure Linen Mandarin Collar Shirt',
        brand: 'IZHO Homme',
        category: 'Men',
        subcategory: "Men's Clothing",
        collection_tag: 'Best Seller',
        description:
          'Milled from 100% long-staple Belgian flax and garment-washed for lived-in softness. Finished with mother-of-pearl buttons and a clean band collar suited for resort or smart-casual tailoring.',
        original_price: 4490,
        discounted_price: 3140,
        discount_percent: 30,
        stock: 48,
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        colors: [
          { name: 'Sage Olive', hex: '#7D846A' },
          { name: 'Chalk White', hex: '#F3F1ED' },
        ],
        images: [
          '/src/assets/images/prod_mens_linen_shirt_1794649863758.jpg',
          '/src/assets/images/prod_minimal_sneakers_1794649865013.jpg',
          '/src/assets/images/prod_chronograph_watch_1794649867115.jpg',
        ],
        rating: 4.8,
        review_count: 193,
        sku: 'IZH-MCL-201',
        is_featured: 1,
      },
      {
        slug: 'charcoal-merino-wool-overshirt-jacket',
        title: 'Charcoal Merino Wool Tailored Overshirt',
        brand: 'IZHO Homme',
        category: 'Men',
        subcategory: "Men's Clothing",
        collection_tag: 'New Arrival',
        description:
          'Double-faced merino wool-blend overshirt featuring twin bellows chest pockets, matte horn buttons, and brushed interior warmth for effortless transitional layering.',
        original_price: 9490,
        discounted_price: 7120,
        discount_percent: 25,
        stock: 22,
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        colors: [
          { name: 'Charcoal Slate', hex: '#383A3E' },
          { name: 'Espresso', hex: '#4B3D38' },
        ],
        images: [
          '/src/assets/images/prod_mens_jacket_1794649863842.jpg',
          '/src/assets/images/prod_chronograph_watch_1794649867115.jpg',
          '/src/assets/images/prod_minimal_sneakers_1794649865013.jpg',
        ],
        rating: 4.9,
        review_count: 74,
        sku: 'IZH-MCL-202',
        is_featured: 0,
      },
      {
        slug: 'pastel-mint-kids-festive-kurta-dress-set',
        title: 'Mint & Ivory Organic Silk Kids Festive Ensemble',
        brand: 'IZHO Little Atelier',
        category: 'Kids',
        subcategory: 'Kids Fashion',
        collection_tag: 'Trending',
        description:
          'Ultra-soft organic cotton-silk festive wear crafted with zero-itch seams, subtle gota-patti trims, and breathable pure cotton lining for all-day celebration comfort.',
        original_price: 3990,
        discounted_price: 2790,
        discount_percent: 30,
        stock: 40,
        sizes: ['2-3Y', '4-5Y', '6-7Y', '8-9Y', '10-12Y'],
        colors: [
          { name: 'Pastel Mint', hex: '#CBE3D8' },
          { name: 'Ivory Pearl', hex: '#F6F2EA' },
        ],
        images: [
          '/src/assets/images/prod_kids_ethnic_1794649864293.jpg',
          '/src/assets/images/promo_festive_silk_1794649861982.jpg',
        ],
        rating: 4.9,
        review_count: 112,
        sku: 'IZH-KID-301',
        is_featured: 1,
      },
      {
        slug: 'rose-quartz-botanical-radiance-serum-duo',
        title: 'Rose Quartz Botanical Radiance Serum & Lip Velvet Duo',
        brand: 'IZHO Beauty',
        category: 'Beauty',
        subcategory: 'Beauty Products',
        collection_tag: 'Best Seller',
        description:
          'Cold-pressed peony extract, 2% niacinamide, and squalane radiance elixir paired with a weightless crushed-rose velvet matte lip colour. Dermatologist-tested, cruelty-free, and vegan.',
        original_price: 3490,
        discounted_price: 2620,
        discount_percent: 25,
        stock: 65,
        sizes: ['30ml + 4g Duo'],
        colors: [
          { name: 'Rose Peony', hex: '#DF8B90' },
          { name: 'Velvet Mauve', hex: '#B76D79' },
        ],
        images: [
          '/src/assets/images/prod_beauty_serum_1794649864797.jpg',
          '/src/assets/images/prod_home_linen_1794649867501.jpg',
        ],
        rating: 4.8,
        review_count: 305,
        sku: 'IZH-BTY-401',
        is_featured: 1,
      },
      {
        slug: 'blush-nude-calfskin-strappy-block-heels',
        title: 'Blush Nude Calfskin Sculptural Block Heels',
        brand: 'IZHO Footwear',
        category: 'Footwear',
        subcategory: 'Shoes',
        collection_tag: 'Trending',
        description:
          'Hand-lasted supple lambskin strappy mules set on a balanced 65mm architectural block heel with memory-foam cushioned leather footbed for effortless day-to-night wear.',
        original_price: 6490,
        discounted_price: 4540,
        discount_percent: 30,
        stock: 29,
        sizes: ['EU 36', 'EU 37', 'EU 38', 'EU 39', 'EU 40', 'EU 41'],
        colors: [
          { name: 'Blush Nude', hex: '#DFC0B4' },
          { name: 'Warm Camel', hex: '#B98C6E' },
        ],
        images: [
          '/src/assets/images/prod_leather_heels_1794649865546.jpg',
          '/src/assets/images/prod_midi_dress_1794649862784.jpg',
        ],
        rating: 4.8,
        review_count: 138,
        sku: 'IZH-FTW-501',
        is_featured: 1,
      },
      {
        slug: 'chalk-suede-leather-court-sneakers',
        title: 'Chalk Tumbled Leather & Suede Court Sneakers',
        brand: 'IZHO Footwear',
        category: 'Footwear',
        subcategory: 'Sneakers',
        collection_tag: 'New Arrival',
        description:
          'Minimalist low-top court sneakers constructed from full-grain Italian tumbled leather, tonal suede toe cap, Ortholite breathable insole, and stitched natural rubber cupsole.',
        original_price: 6990,
        discounted_price: 5240,
        discount_percent: 25,
        stock: 42,
        sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
        colors: [
          { name: 'Chalk Off-White', hex: '#EAE5DC' },
          { name: 'Stone Grey', hex: '#C6C2BC' },
        ],
        images: [
          '/src/assets/images/prod_minimal_sneakers_1794649865013.jpg',
          '/src/assets/images/prod_mens_linen_shirt_1794649863758.jpg',
        ],
        rating: 4.9,
        review_count: 187,
        sku: 'IZH-SNK-502',
        is_featured: 1,
      },
      {
        slug: 'royal-polki-kundan-pearl-choker-set',
        title: '22K Gold-Plated Polki Kundan & Pearl Choker Set',
        brand: 'IZHO Fine Jewels',
        category: 'Jewellery',
        subcategory: 'Jewellery',
        collection_tag: 'Exclusive',
        description:
          'Heirloom-inspired hand-set uncut polki kundan choker finished in 22k micron gold plating over pure brass, fringed with genuine freshwater baroque pearls and paired with matching jhumka drops.',
        original_price: 11490,
        discounted_price: 8040,
        discount_percent: 30,
        stock: 15,
        sizes: ['Adjustable Drawstring'],
        colors: [
          { name: '22K Antique Gold', hex: '#C9A255' },
          { name: 'Rose Kundan', hex: '#C58A7E' },
        ],
        images: [
          '/src/assets/images/prod_kundan_jewellery_1794649866494.jpg',
          '/src/assets/images/prod_silk_saree_1794649861702.jpg',
        ],
        rating: 4.9,
        review_count: 251,
        sku: 'IZH-JWL-601',
        is_featured: 1,
      },
      {
        slug: 'rosegold-sunray-dress-watch-tan-leather',
        title: 'Atelier Rose-Gold Sunray Dress Watch (38mm)',
        brand: 'IZHO Horology',
        category: 'Accessories',
        subcategory: 'Watches',
        collection_tag: 'Exclusive',
        description:
          '316L brushed rose-gold surgical steel case housing a sapphire crystal sunray ivory dial, fluted bezel, Japanese Miyota precision quartz movement, and quick-release Italian calfskin strap.',
        original_price: 14990,
        discounted_price: 11240,
        discount_percent: 25,
        stock: 19,
        sizes: ['38mm Case'],
        colors: [
          { name: 'Rose Gold / Tan', hex: '#B98762' },
          { name: 'Champagne / Espresso', hex: '#6D5242' },
        ],
        images: [
          '/src/assets/images/prod_chronograph_watch_1794649867115.jpg',
          '/src/assets/images/prod_mens_jacket_1794649863842.jpg',
        ],
        rating: 4.8,
        review_count: 96,
        sku: 'IZH-WTC-701',
        is_featured: 1,
      },
      {
        slug: 'dusty-mauve-pebbled-leather-top-handle-tote',
        title: 'Dusty Mauve Pebbled Leather Architectural Tote',
        brand: 'IZHO Leather Goods',
        category: 'Accessories',
        subcategory: 'Handbags',
        collection_tag: 'Best Seller',
        description:
          'Full-grain European pebbled leather satchel featuring brushed champagne-gold turn-lock hardware, suede-lined dual compartments, detachable crossbody strap, and protective metal feet.',
        original_price: 11990,
        discounted_price: 8390,
        discount_percent: 30,
        stock: 24,
        sizes: ['Medium (29 x 22 x 12 cm)'],
        colors: [
          { name: 'Dusty Mauve', hex: '#886E74' },
          { name: 'Warm Taupe', hex: '#9E8D86' },
        ],
        images: [
          '/src/assets/images/prod_leather_handbag_1794649866987.jpg',
          '/src/assets/images/prod_womens_blazer_1794649862786.jpg',
        ],
        rating: 4.9,
        review_count: 174,
        sku: 'IZH-BAG-702',
        is_featured: 1,
      },
      {
        slug: 'ivory-boucle-cushion-ceramic-vase-set',
        title: 'Ivory Bouclé Cushion & Fluted Ceramic Living Trio',
        brand: 'IZHO Home',
        category: 'Home & Living',
        subcategory: 'Home & Living',
        collection_tag: 'New Arrival',
        description:
          'Curated living edit featuring a hand-loomed Belgian ivory bouclé cushion cover, matte stoneware fluted architectural vase, and hand-poured cedar-neroli soy candle in a brushed brass vessel.',
        original_price: 5990,
        discounted_price: 4490,
        discount_percent: 25,
        stock: 31,
        sizes: ['3-Piece Curated Set'],
        colors: [
          { name: 'Travertine Ivory', hex: '#ECE6DC' },
          { name: 'Brushed Brass', hex: '#B49A67' },
        ],
        images: [
          '/src/assets/images/prod_home_linen_1794649867501.jpg',
          '/src/assets/images/promo_festive_silk_1794649861982.jpg',
        ],
        rating: 4.8,
        review_count: 68,
        sku: 'IZH-HOM-801',
        is_featured: 0,
      },
      {
        slug: 'blush-organza-embroidered-festive-saree',
        title: 'Blush Organza Hand-Embroidered Heritage Saree',
        brand: 'IZHO Heritage',
        category: 'Women',
        subcategory: 'Sarees',
        collection_tag: 'Trending',
        description:
          'Featherlight pure silk-organza saree in muted blush rose finished with tonal resham floral embroidery and delicate antique-gold border detailing.',
        original_price: 15490,
        discounted_price: 11620,
        discount_percent: 25,
        stock: 14,
        sizes: ['Free Size (6.3m)'],
        colors: [
          { name: 'Blush Rose', hex: '#E3BFC0' },
          { name: 'Warm Champagne', hex: '#E4D4BE' },
        ],
        images: [
          '/src/assets/images/promo_festive_silk_1794649861982.jpg',
          '/src/assets/images/prod_silk_saree_1794649861702.jpg',
        ],
        rating: 4.9,
        review_count: 91,
        sku: 'IZH-SAR-105',
        is_featured: 0,
      },
      {
        slug: 'atelier-ivory-tailored-silk-blazer-ensemble',
        title: 'Atelier Ivory Silk-Wool Embroidered Blazer Set',
        brand: 'IZHO Atelier',
        category: 'Women',
        subcategory: "Women's Clothing",
        collection_tag: 'Exclusive',
        description:
          'Runway-inspired ivory silk-wool blazer with subtle tonal botanical threadwork along the lapel and hem, paired with fluid pleated trousers.',
        original_price: 19990,
        discounted_price: 14990,
        discount_percent: 25,
        stock: 12,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: [
          { name: 'Atelier Ivory', hex: '#F3EFE6' },
        ],
        images: [
          '/src/assets/images/hero_izho_atelier_1794649860908.jpg',
          '/src/assets/images/prod_womens_blazer_1794649862786.jpg',
        ],
        rating: 5.0,
        review_count: 47,
        sku: 'IZH-WCL-106',
        is_featured: 0,
      },
    ];

    for (const p of seedProducts) {
      insertProd.run(
        p.slug,
        p.title,
        p.brand,
        p.category,
        p.subcategory,
        p.collection_tag,
        p.description,
        p.original_price,
        p.discounted_price,
        p.discount_percent,
        p.stock,
        JSON.stringify(p.sizes),
        JSON.stringify(p.colors),
        JSON.stringify(p.images),
        p.rating,
        p.review_count,
        p.sku,
        p.is_featured
      );
    }

    const insertReview = db.prepare(`
      INSERT INTO reviews (product_id, user_name, rating, title, comment, verified_purchase)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    insertReview.run(
      1,
      'Meera Kulkarni',
      5,
      'Heirloom drape and authentic zari',
      'Wore this for my sister’s reception in Pune. The katan silk falls effortlessly and the dusty-rose tone looks even richer in natural daylight.'
    );
    insertReview.run(
      1,
      'Rhea Sengupta',
      5,
      'Worth every rupee',
      'Packaging was boutique-grade and delivery arrived in 2 days. Subtle antique gold weave without feeling heavy.'
    );
    insertReview.run(
      2,
      'Kavya Nair',
      5,
      'Breezy Chanderi perfection',
      'The organza dupatta elevates the whole outfit. True to size—ordered M and the tailoring is spot-on.'
    );
    insertReview.run(
      3,
      'Tara Malhotra',
      5,
      'Pleats hold beautifully',
      'Looks like an international designer piece. Very flattering wrap waistline.'
    );
  }

  const couponCount = (db.prepare('SELECT COUNT(*) as c FROM coupons').get() as { c: number }).c;
  if (couponCount === 0) {
    const insertCoupon = db.prepare(`
      INSERT INTO coupons (code, description, discount_type, discount_value, min_order, max_discount, active, usage_count, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);
    insertCoupon.run('IZHO15', '15% off on orders above ₹2,999 (up to ₹1,500)', 'percent', 15, 2999, 1500, 14, '2027-12-31');
    insertCoupon.run('WELCOME500', 'Flat ₹500 off on your first order above ₹1,999', 'flat', 500, 1999, 500, 29, '2027-12-31');
    insertCoupon.run('FESTIVE20', '20% off festive collections above ₹5,999 (up to ₹2,500)', 'percent', 20, 5999, 2500, 8, '2027-12-31');
  }

  const bannerCount = (db.prepare('SELECT COUNT(*) as c FROM banners').get() as { c: number }).c;
  if (bannerCount === 0) {
    const insertBanner = db.prepare(`
      INSERT INTO banners (title, subtitle, cta_text, cta_link, image_url, placement, active, display_order)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `);
    insertBanner.run(
      'The Atelier Festive & Tailored Edit',
      'Handwoven Banarasi silks, architectural linen tailoring, and fine polki craftsmanship curated for modern wardrobes.',
      'Explore Collection',
      'Women',
      '/src/assets/images/hero_izho_atelier_1794649860908.jpg',
      'hero',
      1
    );
    insertBanner.run(
      'Artisanal Handloom & Heritage Weaves',
      'Up to 30% off limited-run Chanderi kurtis, organza sarees, and 22k gold-plated fine jewellery. Use code FESTIVE20.',
      'Shop Heritage Edit',
      'Sarees',
      '/src/assets/images/promo_festive_silk_1794649861982.jpg',
      'promo',
      2
    );
  }

  const orderCount = (db.prepare('SELECT COUNT(*) as c FROM orders').get() as { c: number }).c;
  if (orderCount === 0) {
    const insertOrder = db.prepare(`
      INSERT INTO orders (
        order_number, user_id, customer_name, customer_email, customer_phone,
        shipping_address_json, items_json, subtotal, discount_amount, coupon_code,
        shipping_fee, total_amount, payment_method, payment_status,
        razorpay_order_id, razorpay_payment_id, order_status, tracking_history_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertOrder.run(
      'IZH-2026-8410',
      2,
      'Ananya Deshmukh',
      'ananya@izho.in',
      '9820144510',
      JSON.stringify({
        full_name: 'Ananya Deshmukh',
        phone: '9820144510',
        line1: '14 Rosewood Enclave, Rajarampuri 3rd Lane',
        city: 'Kolhapur',
        state: 'Maharashtra',
        pincode: '416008',
      }),
      JSON.stringify([
        {
          product_id: 1,
          title: 'Rosewood Katan Banarasi Silk Saree',
          size: 'Free Size (6.3m)',
          color: 'Dusty Rose',
          quantity: 1,
          price: 13290,
          image: '/src/assets/images/prod_silk_saree_1794649861702.jpg',
        },
      ]),
      13290,
      1500,
      'IZHO15',
      0,
      11790,
      'RAZORPAY',
      'PAID',
      'order_RZP_8410',
      'pay_RZP_841092',
      'SHIPPED',
      JSON.stringify([
        { status: 'PLACED', note: 'Order placed securely via Razorpay', time: '2026-11-11 10:15' },
        { status: 'CONFIRMED', note: 'Payment verified & atelier notified', time: '2026-11-11 10:18' },
        { status: 'PACKED', note: 'Quality checked & packed in muslin keepsake box', time: '2026-11-12 14:20' },
        { status: 'SHIPPED', note: 'Dispatched via BlueDart Express (AWB #BD892140)', time: '2026-11-13 09:00' },
      ]),
      '2026-11-11 10:15:00'
    );

    insertOrder.run(
      'IZH-2026-8411',
      null,
      'Vikramaditya Rao',
      'vikram.rao@example.com',
      '9811223344',
      JSON.stringify({
        full_name: 'Vikramaditya Rao',
        phone: '9811223344',
        line1: '402 Palm Grove, Indiranagar 100ft Rd',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
      }),
      JSON.stringify([
        {
          product_id: 5,
          title: 'Sage Pure Linen Mandarin Collar Shirt',
          size: 'L',
          color: 'Sage Olive',
          quantity: 2,
          price: 3140,
          image: '/src/assets/images/prod_mens_linen_shirt_1794649863758.jpg',
        },
      ]),
      6280,
      500,
      'WELCOME500',
      0,
      5780,
      'COD',
      'PENDING',
      '',
      '',
      'DELIVERED',
      JSON.stringify([
        { status: 'PLACED', note: 'COD order placed', time: '2026-11-08 16:40' },
        { status: 'CONFIRMED', note: 'Confirmed via phone verification', time: '2026-11-08 17:05' },
        { status: 'DELIVERED', note: 'Delivered and COD collected', time: '2026-11-11 13:22' },
      ]),
      '2026-11-08 16:40:00'
    );

    insertOrder.run(
      'IZH-2026-8412',
      null,
      'Nandini Joshi',
      'nandini.j@example.com',
      '9765432109',
      JSON.stringify({
        full_name: 'Nandini Joshi',
        phone: '9765432109',
        line1: '88 Prabhat Road, Deccan Gymkhana',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411004',
      }),
      JSON.stringify([
        {
          product_id: 11,
          title: '22K Gold-Plated Polki Kundan & Pearl Choker Set',
          size: 'Adjustable Drawstring',
          color: '22K Antique Gold',
          quantity: 1,
          price: 8040,
          image: '/src/assets/images/prod_kundan_jewellery_1794649866494.jpg',
        },
        {
          product_id: 8,
          title: 'Rose Quartz Botanical Radiance Serum & Lip Velvet Duo',
          size: '30ml + 4g Duo',
          color: 'Rose Peony',
          quantity: 1,
          price: 2620,
          image: '/src/assets/images/prod_beauty_serum_1794649864797.jpg',
        },
      ]),
      10660,
      1500,
      'IZHO15',
      0,
      9160,
      'RAZORPAY',
      'PAID',
      'order_RZP_8412',
      'pay_RZP_841201',
      'CONFIRMED',
      JSON.stringify([
        { status: 'PLACED', note: 'Order placed securely via Razorpay', time: '2026-11-13 18:10' },
        { status: 'CONFIRMED', note: 'Payment verified & queued for dispatch', time: '2026-11-13 18:12' },
      ]),
      '2026-11-13 18:10:00'
    );
  }
}

export default db;
