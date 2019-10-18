import { getModule } from 'vuex-module-decorators';
import _WalletStore from './wallet';
import _RootStore from './root';
import Vuex from 'vuex';
import Vue from 'vue';

export { DisplayableTx } from './wallet';

Vue.use(Vuex);

const store = new Vuex.Store({
  state: {},
  modules: {
    root: _RootStore,
    wallet: _WalletStore,
  },
});

export const RootStore = getModule(_RootStore, store);
export const WalletStore = getModule(_WalletStore, store);

// Internal variable to register on the Vue instance and Vuex modules
export const _untypedStore = store;
