<template>
  <StartArea :bottom-buttons="bottomBtns">
    <div class="home--login-screen-logo">
      <img src="../assets/logo.png" width="100" />
    </div>
    <div class="home--welcome-header">{{ isNew ? 'Welcome to GODcoin' : 'Welcome back' }}</div>
    <template v-if="isNew">
      <div class="home--form">
        <PasswordInput placeholder="Choose your password" />
        <PasswordInput style="padding-top: 40px;" placeholder="Confirm password" />
      </div>
    </template>
    <template v-else>
    </template>
  </StartArea>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import PasswordInput from '@/components/PasswordInput.vue';
import StartArea from '@/components/StartArea.vue';

@Component({
  components: {
    PasswordInput,
    StartArea,
  },
})
export default class Welcome extends Vue {
  private bottomBtns = [
    {
      icon: 'fa-history',
      link: '/restore-wallet',
      text: 'Restore',
    },
    {
      icon: 'fa-arrow-circle-right',
      link: '/create-wallet',
      text: 'Next',
    },
  ];

  private isNew = true;
}
</script>

<style lang="scss">
$btns-color: hsla(0, 0, 100%, 0.5);

.home--login-screen-logo {
  text-align: center;
  padding-top: 1em;
}

.home--welcome-header {
  color: hsla(0, 0, 100%, 0.9);
  text-align: center;
  padding-top: 1.12em;
  font-size: 1.25em;
  font-weight: 900;
  user-select: none;
}

.home--form,
.home--bottom-buttons {
  padding-top: 75px;
}

.home--bottom-buttons {
  display: flex;
  justify-content: space-between;
  text-align: center;
  user-select: none;
}

.home--bottom-btn,
.home--bottom-btn-right {
  color: $btns-color;
  border-radius: 4px;
  padding: 15px;
  width: 56px;
  height: 48px;

  .home--bottom-btn-txt {
    font-size: 0.9em;
    padding-top: 8px;
    color: $btns-color;
  }
}

.home--bottom-btn {
  background-color: adjust-color($btns-color, $alpha: -0.44);
}

.home--bottom-btn-right {
  background-color: adjust-color($btns-color, $alpha: -0.43);
  color: adjust-color($btns-color, $alpha: 0.05);

  .home--bottom-btn-txt {
    font-weight: bold;
  }
}
</style>
