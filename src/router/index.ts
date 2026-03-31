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
    // Mobile routes
    { path: '/mobile/login', name: 'mobile-login', component: () => import('@/views/mobile/MobileLogin.vue'), meta: { title: '登录', requiresAuth: false } },
    { path: '/mobile', name: 'mobile-layout', component: () => import('@/views/mobile/MobileLayout.vue'), meta: { title: '移动端', requiresAuth: true }, children: [
      { path: '', name: 'mobile-home', component: () => import('@/views/mobile/MobileDashboard.vue'), meta: { title: '首页', requiresAuth: true } },
      { path: 'orders', name: 'mobile-orders', component: () => import('@/views/mobile/MobileOrders.vue'), meta: { title: '订单', requiresAuth: true } },
      { path: 'orders/create', name: 'mobile-order-create', component: () => import('@/views/mobile/MobileOrderCreate.vue'), meta: { title: '新建订单', requiresAuth: true } },
      { path: 'orders/:id', name: 'mobile-order-detail', component: () => import('@/views/mobile/MobileOrderDetail.vue'), meta: { title: '订单详情', requiresAuth: true } },
      { path: 'customers', name: 'mobile-customers', component: () => import('@/views/mobile/MobileCustomers.vue'), meta: { title: '客户', requiresAuth: true } },
      { path: 'customers/create', name: 'mobile-customer-create', component: () => import('@/views/mobile/MobileCustomerCreate.vue'), meta: { title: '新建客户', requiresAuth: true } },
      { path: 'customers/:id', name: 'mobile-customer-detail', component: () => import('@/views/mobile/MobileCustomerDetail.vue'), meta: { title: '客户详情', requiresAuth: true } },
      { path: 'finance', name: 'mobile-finance', component: () => import('@/views/mobile/MobileFinance.vue'), meta: { title: '财务', requiresAuth: true } },
      { path: 'inventory', name: 'mobile-inventory', component: () => import('@/views/mobile/MobileInventory.vue'), meta: { title: '库存', requiresAuth: true } },
      { path: 'rack', name: 'mobile-rack', component: () => import('@/views/mobile/MobileRack.vue'), meta: { title: '货架', requiresAuth: true } },
      { path: 'profile', name: 'mobile-profile', component: () => import('@/views/mobile/MobileProfile.vue'), meta: { title: '我的', requiresAuth: true } },
    ]},
  ],
})

// 导航守卫：检查认证状态
router.beforeEach(async (to, _from, next) => {
  const { session } = await auth.getSession()
  const isMobileRoute = to.path.startsWith('/mobile')

  if (to.meta.requiresAuth && !session) {
    // 移动端路由跳转到移动端登录
    if (isMobileRoute) {
      next({ name: 'mobile-login' })
    } else {
      next({ name: 'Login' })
    }
  } else if (to.name === 'Login' && session) {
    next({ name: 'dashboard' })
  } else if (to.name === 'mobile-login' && session) {
    // 已登录用户访问移动端登录页，跳转到移动端首页
    next({ name: 'mobile-home' })
  } else {
    next()
  }
})

export default router