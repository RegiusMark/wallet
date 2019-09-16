<template>
  <StartArea :bottom-buttons="bottomBtns">
    <div class="welcome-header">{{ isNew ? 'Welcome to GODcoin' : 'Welcome back' }}</div>
    <template v-if="isNew">
      <div class="form">
        <PasswordInput placeholder="Choose your password" v-model="passwords.initial" />
        <PasswordInput placeholder="Confirm password" v-model="passwords.confirm" />
        <div style="text-align: center; user-select: none">
          <span>{{ helpMsg }}</span>
        </div>
      </div>
    </template>
    <template v-else> </template>
  </StartArea>
</template>

<script lang="ts">
import { Component, Watch, Vue } from 'vue-property-decorator';
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

  private helpMsgs = {
    emptyForm: "Let's start creating your wallet by typing your password.",
    passMismatch: "Those passwords don't match. Please try again.",
    ready: 'Click the arrow or press "ENTER" to continue.',
  };

  private helpMsg = this.helpMsgs.emptyForm;

  private isNew = true;
  private passMismatchTimeout: NodeJS.Timeout | null = null;
  private passwords = {
    initial: '',
    confirm: '',
  };

  @Watch('passwords', { deep: true })
  onPropertyChanged(value: { initial: string; confirm: string }) {
    if (this.passMismatchTimeout) {
      clearTimeout(this.passMismatchTimeout);
      this.passMismatchTimeout = null;
    }

    const { initial, confirm } = value;

    if (initial && confirm) {
      // Both passwords supplied
      if (initial === confirm) {
        this.helpMsg = this.helpMsgs.ready;
      } else {
        this.passMismatchTimeout = setTimeout(() => {
          this.helpMsg = this.helpMsgs.passMismatch;
        }, 250);
      }
    } else {
      this.helpMsg = this.helpMsgs.emptyForm;
    }
  }
}
</script>

<style lang="scss" scoped>
.welcome-header {
  color: hsla(0, 0, 100%, 0.9);
  text-align: center;
  padding-top: 1.12em;
  font-size: 1.25em;
  font-weight: 900;
  user-select: none;
}

.form {
  margin-top: 60px;
  color: hsla(0, 0, 100%, 0.55);

  & > * {
    margin-bottom: 35px;
  }
}
</style>
