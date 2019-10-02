<template>
  <DashArea>
    <div class="container">
      <div>
        <img src="../../assets/coin-front.png" width="120" />
      </div>
      <div>
        <span>0.00000 GRAEL</span>
      </div>
    </div>
  </DashArea>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import DashArea from '@/components/DashArea.vue';

@Component({
  components: {
    DashArea,
  },
})
export default class Dashboard extends Vue {}
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: center;

  & > div {
    flex: 1;
  }
}
</style>
