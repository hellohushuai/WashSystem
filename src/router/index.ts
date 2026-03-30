import { createRouter, createWebHistory } from 'vue-router'
import { auth } from '@/lib/supabase'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'Login', component: () => import('@/views/LoginView.vue'), meta: { title: '登录', requiresAuth: false } },
    { path: '/', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { title: '仪表盘', requiresAuth: true } },
    { path: '/orders', name: 'orders', component: () => import('@/views/OrderListView.vue'), meta: { title: '订单管理', requiresAuth: true } },
    { path: '/orders/create', name: 'order-create', component: () => import('@/views/OrderCreateView.vue'), meta: { title: '新建订单', requiresAuth: true } },
    { path: '/orders/:id', name: 'order-detail', component: () => import('@/views/OrderDetailView.vue'), meta: { title: '订单详情', requiresAuth: true } },
    { path: '/customers', name: 'customers', component: () => import('@/views/CustomerListView.vue'), meta: { title: '客户管理', requiresAuth: true } },
    { path: '/customers/:id', name: 'customer-detail', component: () => import('@/views/CustomerDetailView.vue'), meta: { title: '客户详情', requiresAuth: true } },
    { path: '/customers/membership', name: 'membership', component: () => import('@/views/MembershipSettingsView.vue'), meta: { title: '会员等级设置', requiresAuth: true } },
    { path: '/settings/garment-types', name: 'garment-types', component: () => import('@/views/GarmentTypeView.vue'), meta: { title: '衣物类型管理', requiresAuth: true } },
    { path: '/settings/service-types', name: 'service-types', component: () => import('@/views/ServiceTypeView.vue'), meta: { title: '服务类型管理', requiresAuth: true } },
    { path: '/finance', name: 'finance', component: () => import('@/views/FinanceView.vue'), meta: { title: '财务管理', requiresAuth: true } },
    { path: '/inventory', name: 'inventory', component: () => import('@/views/InventoryView.vue'), meta: { title: '库存管理', requiresAuth: true } },
    { path: '/rack', name: 'rack', component: () => import('@/views/RackView.vue'), meta: { title: '货架管理', requiresAuth: true } },
  ],
})

// 导航守卫：检查认证状态
router.beforeEach(async (to, _from, next) => {
  const { session } = await auth.getSession()

  if (to.meta.requiresAuth && !session) {
    next({ name: 'Login' })
  } else if (to.name === 'Login' && session) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router