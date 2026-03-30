CREATE TABLE IF NOT EXISTS membership_levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    discount REAL NOT NULL DEFAULT 1.0 CHECK(discount >= 0 AND discount <= 1),
    points_threshold INTEGER NOT NULL DEFAULT 0 CHECK(points_threshold >= 0),
    points_rate REAL NOT NULL DEFAULT 1.0,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    membership_level_id INTEGER REFERENCES membership_levels(id) ON DELETE SET NULL,
    points INTEGER NOT NULL DEFAULT 0 CHECK(points >= 0),
    balance REAL NOT NULL DEFAULT 0 CHECK(balance >= 0),
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT '未开始',
    total_amount REAL NOT NULL DEFAULT 0 CHECK(total_amount >= 0),
    paid_amount REAL NOT NULL DEFAULT 0 CHECK(paid_amount >= 0),
    payment_method TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    completed_at TEXT,
    picked_up_at TEXT
);

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    garment_type TEXT NOT NULL,
    service_type TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0 CHECK(price >= 0),
    hook_no INTEGER REFERENCES rack_hooks(hook_no) ON DELETE SET NULL,
    is_picked_up INTEGER NOT NULL DEFAULT 0,
    notes TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '其他',
    quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
    unit TEXT NOT NULL DEFAULT '个',
    min_quantity INTEGER NOT NULL DEFAULT 0 CHECK(min_quantity >= 0),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS financial_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount >= 0),
    category TEXT NOT NULL DEFAULT '其他',
    source TEXT NOT NULL DEFAULT 'manual',
    related_order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    related_customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    description TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS recharge_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount REAL NOT NULL CHECK(amount > 0),
    payment_method TEXT NOT NULL DEFAULT '现金',
    description TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS purchase_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    unit_price REAL NOT NULL CHECK(unit_price >= 0),
    supplier TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS rack_hooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hook_no INTEGER NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT '空闲',
    order_item_id INTEGER REFERENCES order_items(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS rack_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total_hooks INTEGER NOT NULL DEFAULT 100
);

-- Indexes for foreign key columns to improve query performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_hook_no ON order_items(hook_no);
CREATE INDEX IF NOT EXISTS idx_financial_records_related_order_id ON financial_records(related_order_id);

CREATE TABLE IF NOT EXISTS garment_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    price REAL NOT NULL DEFAULT 0 CHECK(price >= 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS service_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    price REAL NOT NULL DEFAULT 0 CHECK(price >= 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- Seed default data for garment types
INSERT OR IGNORE INTO rack_settings (id, total_hooks) VALUES (1, 100);

INSERT OR IGNORE INTO membership_levels (id, name, discount, points_threshold, points_rate, sort_order)
VALUES
    (1, '普通', 1.0, 0, 1.0, 0),
    (2, '青铜', 0.98, 200, 1.2, 1),
    (3, '白银', 0.95, 500, 1.5, 2),
    (4, '黄金', 0.9, 2000, 2.0, 3),
    (5, '钻石', 0.85, 5000, 2.5, 4);

-- Generate 100 hooks (SQLite recursive CTE)
INSERT OR IGNORE INTO rack_hooks (hook_no, status)
WITH RECURSIVE cnt(x) AS (
    SELECT 1
    UNION ALL
    SELECT x+1 FROM cnt WHERE x < 100
)
SELECT x, '空闲' FROM cnt;

-- Seed default data for garment types
INSERT OR IGNORE INTO garment_types (id, name, price, sort_order) VALUES
    (1, '上衣', 15, 1),
    (2, '裤子', 15, 2),
    (3, '裙子', 20, 3),
    (4, '西装', 30, 4),
    (5, '大衣', 35, 5),
    (6, '羽绒服', 30, 6),
    (7, '衬衫', 12, 7),
    (8, 'T恤', 10, 8),
    (9, '运动服', 15, 9),
    (10, '牛仔服', 18, 10),
    (11, '毛衣', 18, 11),
    (12, '领带', 8, 12),
    (13, '围巾', 10, 13),
    (14, '帽子', 8, 14),
    (15, '手套', 5, 15);

-- Seed default data for service types
INSERT OR IGNORE INTO service_types (id, name, price, sort_order) VALUES
    (1, '普通清洗', 0, 1),
    (2, '干洗', 10, 2),
    (3, '熨烫', 5, 3),
    (4, '修补', 8, 4),
    (5, '染色', 20, 5),
    (6, '去渍', 12, 6),
    (7, '杀菌', 15, 7),
    (8, '上浆', 8, 8),
    (9, '织补', 25, 9),
    (10, '翻新', 30, 10);
