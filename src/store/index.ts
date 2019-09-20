import Vue from 'vue';
import Vuex from 'vuex';
import _RootStore from './root';
import { getModule } from 'vuex-module-decorators';

Vue.use(Vuex);

const store = new Vuex.Store({
  state: {},
  modules: {
    root: _RootStore,
  },
});

export const RootStore = getModule(_RootStore, store);

// Internal variable to register on the Vue instance and Vuex modules
export const _untypedStore = store;
