<template>
  <StartArea :bottom-buttons="bottomBtns" header-msg="Welcome back"> </StartArea>
</template>

<script lang="ts">
import { Component, Watch, Vue } from 'vue-property-decorator';
import StartArea, { Button } from '@/components/StartArea.vue';
import PasswordInput from '@/components/PasswordInput.vue';

@Component({
  components: {
    PasswordInput,
    StartArea,
  },
})
export default class Welcome extends Vue {
  private bottomBtns: Button[] = [
    {
      icon: 'fa-history',
      link: '/restore-wallet',
      text: 'Restore',
      disabled: false,
    },
  ];

  private isNew = true;

  /* Vue lifecycle hook */
  beforeMount() {
    if (this.isNew) {
      this.$router.push('/create-wallet-1');
    }
  }
}
</script>

<style lang="scss" scoped>
.form {
  margin-top: 60px;
  color: hsla(0, 0, 100%, 0.55);

  & > * {
    margin-bottom: 35px;
  }
}
</style>
