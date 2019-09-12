<template>
  <StartArea :bottom-buttons="bottomBtns">
    <div class="welcome-header">{{ isNew ? 'Welcome to GODcoin' : 'Welcome back' }}</div>
    <template v-if="isNew">
      <div class="form">
        <PasswordInput placeholder="Choose your password" />
        <PasswordInput style="padding-top: 40px;" placeholder="Confirm password" />
      </div>
    </template>
    <template v-else> </template>
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

<style lang="scss" scoped>
$btns-color: hsla(0, 0, 100%, 0.5);

.welcome-header {
  color: hsla(0, 0, 100%, 0.9);
  text-align: center;
  padding-top: 1.12em;
  font-size: 1.25em;
  font-weight: 900;
  user-select: none;
}

.form {
  padding-top: 75px;
}
</style>
