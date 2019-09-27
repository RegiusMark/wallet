import Vue from 'vue';
import Router from 'vue-router';
import Welcome from './views/Welcome.vue';

Vue.use(Router);

const DEFAULT_TITLE = 'GODcoin Wallet';

const router = new Router({
  routes: [
    {
      path: '/',
      name: 'welcome',
      component: Welcome,
    },
    {
      path: '/create-wallet-1',
      name: 'create-wallet-1',
      component: (): any => import(/* webpackChunkName: "create-wallet" */ './views/CreateWallet-1.vue'),
    },
    {
      path: '/create-wallet-2',
      name: 'create-wallet-2',
      component: (): any => import(/* webpackChunkName: "create-wallet" */ './views/CreateWallet-2.vue'),
    },
    {
      path: '/restore-wallet-1',
      name: 'restore-wallet-1',
      component: (): any => import(/* webpackChunkName: "restore-wallet" */ './views/RestoreWallet-1.vue'),
    },
    {
      path: '/restore-wallet-2',
      name: 'restore-wallet-2',
      component: (): any => import(/* webpackChunkName: "restore-wallet" */ './views/RestoreWallet-2.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: (): any => import(/* webpackChunkName: "dashboard" */ './views/Dashboard.vue'),
    },
  ],
});

router.afterEach((to, _from) => {
  document.title = to.meta.title || DEFAULT_TITLE;
});

export default router;
