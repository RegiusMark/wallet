<template>
  <div id="app" style="height: 100%">
    <router-view />
  </div>
</template>

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
