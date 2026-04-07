import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'media-kit',
      component: () => import('@/presentation/views/MediaKitView.vue'),
    },
    {
      path: '/admin',
      component: () => import('@/presentation/layouts/AdminLayout.vue'),
      meta: { requiresAdmin: true },
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('@/presentation/views/admin/AdminDashboardView.vue'),
        },
        {
          path: 'panels',
          name: 'admin-panels',
          component: () => import('@/presentation/views/admin/PanelsListView.vue'),
        },
        {
          path: 'panels/new',
          name: 'admin-panel-new',
          component: () => import('@/presentation/views/admin/PanelFormView.vue'),
        },
        {
          path: 'panels/:id/edit',
          name: 'admin-panel-edit',
          component: () => import('@/presentation/views/admin/PanelFormView.vue'),
          props: true,
        },
        {
          path: 'clients',
          name: 'admin-clients',
          component: () => import('@/presentation/views/admin/ClientsListView.vue'),
        },
        {
          path: 'contracts',
          name: 'admin-contracts',
          component: () => import('@/presentation/views/admin/ContractsListView.vue'),
        },
        {
          path: 'contracts/new',
          name: 'admin-contract-new',
          component: () => import('@/presentation/views/admin/ContractFormView.vue'),
        },
        {
          path: 'quotes',
          name: 'admin-quotes',
          component: () => import('@/presentation/views/admin/QuotesListView.vue'),
        },
        {
          path: 'templates',
          name: 'admin-templates',
          component: () => import('@/presentation/views/admin/TemplatesListView.vue'),
        },
        {
          path: 'settings',
          name: 'admin-settings',
          component: () => import('@/presentation/views/admin/SiteSettingsView.vue'),
        },
      ],
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/presentation/views/LoginView.vue'),
    },
    {
      path: '/client',
      component: () => import('@/presentation/layouts/ClientLayout.vue'),
      meta: { requiresClient: true },
      children: [
        {
          path: '',
          name: 'client-home',
          component: () => import('@/presentation/views/client/ClientHomeView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.initialized) {
    await auth.initialize()
  }
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.requiresClient && !auth.isClientUser) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
