<template>
  <div id="app" style="height: 100%">
    <router-view />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component
export default class extends Vue {
  /* Vue lifecycle hook */
  private beforeMount(): void {
    /* eslint-disable no-console */
    console.log('%cWARNING!', 'background-color: yellow; color: red; font-size: 30px;');
    console.log(
      '%cThis is the developer console intended for developers. You must read and understand everything ' +
        'before pasting or typing it here.',
      'font-size: 15px;',
    );
    /* eslint-enable no-console */
  }
}
</script>

<style lang="scss">
@import '@/assets/fontawesome/scss/fontawesome.scss';
@import '@/assets/fontawesome/scss/regular.scss';
@import '@/assets/fontawesome/scss/solid.scss';

html {
  // Change the default rem size
  font-size: 18px;
}

html,
body {
  margin: 0;
  height: 100%;
}

a {
  color: white;
  text-decoration: none;
}
</style>
