# 干洗店管理系统

一款功能完善的干洗店桌面/移动应用程序，支持订单管理、客户管理、财务管理、库存管理和货架管理等功能。

**最新版本**: v1.1.0

## 功能特性

### 订单管理
- 创建订单：选择客户，添加衣物类型和服务类型，系统自动计算价格
- 订单列表：查看所有订单，支持状态、日期、客户筛选
- 订单详情：查看订单详情，进行付款、取衣等操作
- 付款功能：支持余额支付、抹零、多种支付方式（现金/微信/支付宝/银行卡）

### 客户管理
- 客户列表：查看所有客户信息
- 客户详情：查看客户历史订单、账户余额
- 会员等级：设置不同等级的折扣和积分倍率
- 账户充值：支持充值，记录充值记录

### 财务管理
- 财务概览：收入合计、支出合计、净利润统计
- 收入明细：订单收入、充值收入、其他收入
- 支出明细：采购支出、其他支出
- 采购记录：管理耗材采购支出（自动同步到库存）
- 手工记账：手动添加收支记录
- 日结/月报表：按日期统计财务数据

### 库存管理
- 管理库存物品
- 调整库存数量
- 设置最低库存提醒

### 货架管理
- 可视化货架挂钩状态
- 空闲/占用状态
- 可设置总挂钩数量

### 基础数据管理
- 衣物类型管理：添加、编辑、删除衣物类型，设置价格
- 服务类型管理：添加、编辑、删除服务类型，设置加价

### 数据导入导出
- 客户数据导入/导出（CSV）
- 订单数据导出（CSV）
- 衣物类型导入/导出（CSV）
- 服务类型导入/导出（CSV）

### 认证与同步 (v1.1.0 新增)
- 用户登录/注册功能
- 云端数据同步（Supabase）
- 支持移动端访问

## 技术栈

- **前端框架**: Vue 3 + TypeScript
- **UI 组件库**: Element Plus
- **状态管理**: Pinia
- **桌面框架**: Tauri 2.x
- **移动端**: 响应式设计，支持 Android
- **云数据库**: Supabase (PostgreSQL)
- **构建工具**: Vite

## 支持平台

- ✅ Windows 10+ (x64)
- ✅ macOS 10.15+ (Apple Silicon)
- ✅ Android (APK)

## 开发

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run tauri dev
```

### 构建安装包

```bash
# 构建所有平台
npm run tauri build

# 仅构建 Android
npm run tauri build -- --target aarch64-linux-android

# 仅构建 Windows
npm run tauri build -- --target x86_64-pc-windows-gnu

# 仅构建 macOS
npm run tauri build -- --target aarch64-apple-darwin
```

## 数据库

系统使用 Supabase (PostgreSQL) 进行云端数据存储。数据库表结构定义见 `docs/supabase_schema.sql`。

### 主要数据表
- `customers` - 客户信息
- `orders` - 订单
- `order_items` - 订单项目
- `membership_levels` - 会员等级
- `financial_records` - 财务记录
- `recharge_records` - 充值记录
- `purchase_records` - 采购记录
- `inventory` - 库存
- `rack_hooks` - 货架挂钩
- `rack_settings` - 货架设置
- `garment_types` - 衣物类型
- `service_types` - 服务类型

## 项目结构

```
src/
├── components/     # 公共组件
├── db/            # 数据库相关
├── lib/           # 工具库（Supabase 客户端）
├── router/        # 路由配置
├── stores/        # Pinia 状态管理
├── views/         # 页面视图
└── App.vue        # 根组件
```

## 许可证

MIT

## 更新日志

### v1.1.0 (2026-03-30)
- 新增：用户登录/注册功能
- 新增：Supabase 云端数据同步
- 新增：移动端响应式设计
- 新增：Android APK 构建支持
- 优化：多平台构建（Windows/macOS/Android）

### v1.0.0 (初始版本)
- 基础功能：订单、客户、财务、库存、货架管理
- 数据导入导出
- 会员等级系统