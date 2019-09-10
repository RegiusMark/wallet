<template>
  <div class="home">
    <div class="home--content">
      <div class="home--login-screen-logo">
        <img src="../assets/logo.png" width="100" />
      </div>
      <template v-if="isNew">
        <div class="home--welcome-header">Welcome to GODcoin</div>
        <div class="home--form">
          <PasswordInput placeholder="Choose your password" />
          <PasswordInput style="padding-top: 40px;" placeholder="Confirm password" />
        </div>
        <div class="home--bottom-buttons">
          <router-link to="/restore-wallet" class="home--bottom-btn">
            <i class="fas fa-history fa-lg"></i>
            <div class="home--bottom-btn-txt">Restore</div>
          </router-link>
          <router-link to="/create-wallet" class="home--bottom-btn-right">
            <i class="fas fa-arrow-circle-right fa-lg"></i>
            <div class="home--bottom-btn-txt">Next</div>
          </router-link>
        </div>
      </template>
      <template v-else>
        <div class="home--welcome-header">Welcome back</div>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import PasswordInput from '@/components/PasswordInput.vue';

@Component({
  components: {
    PasswordInput,
  },
})
export default class Welcome extends Vue {
  isNew = true;
}
</script>

<style lang="scss">
$btns-color: hsla(0, 0, 100%, 0.5);

.home::before {
  background-image: url('../assets/login-bg.jpg');
  background-size: cover;
  content: '';
  width: 100%;
  height: 100%;

  position: absolute;
  top: 0;
  left: 0;
}

.home {
  margin-left: 15%;
  margin-right: 15%;
}

.home--content {
  position: relative;
}

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
