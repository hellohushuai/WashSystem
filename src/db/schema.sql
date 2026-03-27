CREATE TABLE IF NOT EXISTS membership_levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    discount REAL NOT NULL DEFAULT 1.0,
    points_threshold INTEGER NOT NULL DEFAULT 0,
    points_rate REAL NOT NULL DEFAULT 1.0,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    membership_level_id INTEGER REFERENCES membership_levels(id),
    points INTEGER NOT NULL DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    status TEXT NOT NULL DEFAULT '未开始',
    total_amount REAL NOT NULL DEFAULT 0,
    paid_amount REAL NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    completed_at TEXT,
    picked_up_at TEXT
);

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    garment_type TEXT NOT NULL,
    service_type TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    hook_no INTEGER,
    is_picked_up INTEGER NOT NULL DEFAULT 0,
    notes TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '其他',
    quantity REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT '个',
    min_quantity REAL NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS financial_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL DEFAULT '其他',
    related_order_id INTEGER REFERENCES orders(id),
    description TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS rack_hooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hook_no INTEGER NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT '空闲',
    order_item_id INTEGER REFERENCES order_items(id)
);

CREATE TABLE IF NOT EXISTS rack_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total_hooks INTEGER NOT NULL DEFAULT 100
);

-- Seed default data
INSERT OR IGNORE INTO rack_settings (id, total_hooks) VALUES (1, 100);

INSERT OR IGNORE INTO membership_levels (id, name, discount, points_threshold, points_rate, sort_order)
VALUES
    (1, '普通', 1.0, 0, 1.0, 0),
    (2, '银卡', 0.95, 500, 1.5, 1),
    (3, '金卡', 0.9, 2000, 2.0, 2);

-- Generate 100 hooks (SQLite recursive CTE)
INSERT OR IGNORE INTO rack_hooks (hook_no, status)
WITH RECURSIVE cnt(x) AS (
    SELECT 1
    UNION ALL
    SELECT x+1 FROM cnt WHERE x < 100
)
SELECT x, '空闲' FROM cnt;
