import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { title: '仪表盘' } },
    { path: '/orders', name: 'orders', component: () => import('@/views/OrderListView.vue'), meta: { title: '订单管理' } },
    { path: '/orders/create', name: 'order-create', component: () => import('@/views/OrderCreateView.vue'), meta: { title: '新建订单' } },
    { path: '/orders/:id', name: 'order-detail', component: () => import('@/views/OrderDetailView.vue'), meta: { title: '订单详情' } },
    { path: '/customers', name: 'customers', component: () => import('@/views/CustomerListView.vue'), meta: { title: '客户管理' } },
    { path: '/customers/:id', name: 'customer-detail', component: () => import('@/views/CustomerDetailView.vue'), meta: { title: '客户详情' } },
    { path: '/customers/membership', name: 'membership', component: () => import('@/views/MembershipSettingsView.vue'), meta: { title: '会员等级设置' } },
    { path: '/settings/garment-types', name: 'garment-types', component: () => import('@/views/GarmentTypeView.vue'), meta: { title: '衣物类型管理' } },
    { path: '/settings/service-types', name: 'service-types', component: () => import('@/views/ServiceTypeView.vue'), meta: { title: '服务类型管理' } },
    { path: '/finance', name: 'finance', component: () => import('@/views/FinanceView.vue'), meta: { title: '财务管理' } },
    { path: '/inventory', name: 'inventory', component: () => import('@/views/InventoryView.vue'), meta: { title: '库存管理' } },
    { path: '/rack', name: 'rack', component: () => import('@/views/RackView.vue'), meta: { title: '货架管理' } },
  ],
})

export default router