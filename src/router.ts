import Vue from 'vue';
import Router from 'vue-router';
import Welcome from './views/start/Welcome.vue';

Vue.use(Router);

const DEFAULT_TITLE = 'GODcoin Wallet';

const router = new Router({
  routes: [
    {
      path: '/start',
      component: Welcome,
    },
    {
      path: '/start/create-wallet-1',
      component: (): any => import(/* webpackChunkName: "start" */ './views/start/CreateWallet-1.vue'),
    },
    {
      path: '/start/create-wallet-2',
      component: (): any => import(/* webpackChunkName: "start" */ './views/start/CreateWallet-2.vue'),
    },
    {
      path: '/start/restore-wallet-1',
      component: (): any => import(/* webpackChunkName: "start" */ './views/start/RestoreWallet-1.vue'),
    },
    {
      path: '/start/restore-wallet-2',
      component: (): any => import(/* webpackChunkName: "start" */ './views/start/RestoreWallet-2.vue'),
    },
    {
      path: '/wallet/dashboard',
      component: (): any => import(/* webpackChunkName: "wallet" */ './views/wallet/Dashboard.vue'),
    },
    {
      path: '/wallet/backup',
      component: (): any => import(/* webpackChunkName: "wallet" */ './views/wallet/Backup.vue'),
    },
  ],
});

router.afterEach((to, _from) => {
  document.title = to.meta.title || DEFAULT_TITLE;
});

export default router;
