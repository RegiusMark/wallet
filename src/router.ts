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
      path: '/create-wallet',
      name: 'create-wallet',
      // route level code-splitting
      // this generates a separate chunk (about.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import(/* webpackChunkName: "create-wallet" */ './views/CreateWallet.vue'),
    },
    {
      path: '/restore-wallet',
      name: 'restore-wallet',
      component: () => import(/* webpackChunkName: "restore-wallet" */ './views/RestoreWallet.vue'),
    },
  ],
});

router.afterEach((to, _from) => {
  document.title = to.meta.title || DEFAULT_TITLE;
});

export default router;
