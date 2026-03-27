# 干洗店管理系统设计文档

## 概述

面向单店干洗店的桌面管理系统，支持 Windows 和 macOS 双平台。系统涵盖订单管理、客户管理、财务管理、库存管理和衣物货架管理五大核心模块。纯本地数据存储，离线使用，中文界面。

目标用户：小型干洗店店主/员工，日均处理 10-30 单。

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 桌面框架 | Tauri 2.x | 一套代码生成 Windows 和 macOS 安装包 |
| 前端 | Vue 3 + TypeScript | 组合式 API |
| UI 组件库 | Element Plus | 中文组件库，表格/表单/日期选择开箱即用 |
| 状态管理 | Pinia | 轻量、TypeScript 友好 |
| 后端 | Rust (Tauri 内置) | 数据库操作和文件系统 |
| 数据库 | SQLite (tauri-plugin-sql) | 本地嵌入式数据库 |
| 构建工具 | Vite | 快速开发和构建 |

## 数据模型

### customers（客户表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| name | TEXT | 客户姓名 |
| phone | TEXT UNIQUE | 手机号（唯一标识） |
| membership_level_id | INTEGER FK | 关联会员等级 |
| points | INTEGER | 积分余额 |
| notes | TEXT | 备注 |
| created_at | DATETIME | 创建时间 |

### membership_levels（会员等级表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| name | TEXT | 等级名称（如普通/银卡/金卡） |
| discount | DECIMAL | 折扣比例（如 0.9 = 九折） |
| points_threshold | INTEGER | 升级所需积分 |
| points_rate | DECIMAL | 积分倍率（消费1元获得的积分） |
| sort_order | INTEGER | 排序 |

### orders（订单表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| order_no | TEXT UNIQUE | 订单编号（如 DC20260327001） |
| customer_id | INTEGER FK | 关联客户 |
| status | TEXT | 未开始/进行中/已付款/已结束 |
| total_amount | DECIMAL | 总金额 |
| paid_amount | DECIMAL | 已付金额 |
| payment_method | TEXT | 现金/微信/支付宝/其他 |
| notes | TEXT | 备注 |
| created_at | DATETIME | 下单时间 |
| completed_at | DATETIME | 完成时间 |
| picked_up_at | DATETIME | 全部取衣时间 |

**订单状态流转：** 未开始 → 进行中 → 已付款 → 已结束

- 未开始：订单创建，衣物已登记
- 进行中：衣物正在清洗处理
- 已付款：客户已付清全部费用（paid_amount >= total_amount）
- 已结束：客户已取走所有衣物且已付款，订单关闭

关闭订单条件（两个都满足）：
1. 已付款
2. 所有 order_items 的 is_picked_up 均为 true

### order_items（订单明细表）

每件衣物一条记录。例如客户送来 3 件衬衫，则创建 3 条记录，每条分配独立挂钩。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| order_id | INTEGER FK | 关联订单 |
| garment_type | TEXT | 衣物类型（衬衫/外套/裤子等） |
| service_type | TEXT | 服务类型（普洗/干洗/去渍等） |
| price | DECIMAL | 单价 |
| hook_no | INTEGER | 分配的挂钩编号（一件一钩） |
| is_picked_up | BOOLEAN | 是否已取走，默认 false |
| notes | TEXT | 特殊要求 |

### inventory（库存表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| name | TEXT | 物品名称 |
| category | TEXT | 分类（洗涤剂/包装材料/其他） |
| quantity | DECIMAL | 当前库存量 |
| unit | TEXT | 单位（瓶/包/个等） |
| min_quantity | DECIMAL | 最低库存警告值 |
| updated_at | DATETIME | 最后更新时间 |

### financial_records（财务流水表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| type | TEXT | 收入/支出 |
| amount | DECIMAL | 金额 |
| category | TEXT | 分类（订单收入/耗材采购/其他） |
| related_order_id | INTEGER FK | 关联订单（可选） |
| description | TEXT | 描述 |
| created_at | DATETIME | 记录时间 |

### rack_hooks（挂钩表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| hook_no | INTEGER UNIQUE | 挂钩编号（1-100） |
| status | TEXT | 空闲/占用 |
| order_item_id | INTEGER FK | 关联的订单明细（空闲时为 null） |

### rack_settings（货架设置表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| total_hooks | INTEGER | 挂钩总数，默认 100 |

## 功能模块与页面结构

左侧可折叠导航栏 + 右侧内容区。折叠后只显示图标，展开后显示图标+文字。

### 1. 仪表盘（首页）

- 今日订单数、今日收入、空闲挂钩数
- 待处理订单列表（快捷入口）
- 库存不足预警提示

### 2. 订单管理

- **订单列表：** 按状态筛选（未开始/进行中/已付款/已结束），支持按日期、客户搜索
- **新建订单：** 选择客户（或快速新建）→ 添加衣物明细（类型、服务、数量）→ 自动计算金额（应用会员折扣）→ 自动分配挂钩 → 提交
- **订单详情：** 查看/编辑衣物明细、标记单件取衣、记录付款、变更状态
- 状态流转按钮根据业务规则控制（必须全部取衣+已付款才能结束）
- 挂钩不足时提示"挂钩已满，无法接单"

### 3. 客户管理

- **客户列表：** 搜索、查看会员等级
- **客户详情：** 基本信息、积分、历史订单
- **会员等级设置：** 增删改会员等级、折扣比例、积分规则

### 4. 财务管理

- **收支流水：** 按日期范围查看所有收入/支出记录
- **手动记账：** 添加非订单收支（如采购耗材、水电费等）
- **日结报表：** 当日收入汇总、订单数
- **月报表：** 按月统计收入、支出、利润趋势

### 5. 库存管理

- **库存列表：** 当前库存量，低于最低库存高亮预警
- **入库/出库操作：** 记录库存变动
- **耗材分类管理**

### 6. 货架管理

- **可视化展示：** 所有挂钩状态（空闲/占用），占用的显示关联的衣物和客户信息
- **点击跳转：** 点击占用的挂钩可跳转到对应订单
- **挂钩设置：** 调整挂钩总数（只能删除空闲挂钩）

## UI 设计

### 布局

经典侧边栏布局：左侧固定导航栏（可折叠） + 右侧内容区。

- 侧边栏展开宽度约 200px，折叠后约 64px（仅图标）
- 折叠/展开按钮位于侧边栏底部
- 内容区顶部显示当前页面标题和面包屑

### 主题

支持三种主题，可自由切换，选择保存到本地：

1. **经典蓝（亮色）：** Element Plus 默认蓝色主题，深色侧边栏，亮色内容区。专业稳重。
2. **暗色模式：** 全暗色主题，减少视觉疲劳，适合长时间使用。
3. **清新绿（亮色）：** 绿色主题，清新自然，与干洗店"洁净"品牌形象契合。

主题切换入口位于侧边栏底部（折叠按钮旁）。

## 不包含的功能

- 员工管理（排班、工资、权限）
- 电子支付接入（微信/支付宝/POS）
- 打印功能（小票/标签）
- 多语言支持
- 云端同步/多设备访问
- 多店铺管理
