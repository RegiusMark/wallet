import { Module, Mutation, VuexModule } from 'vuex-module-decorators';
import { KeyPair } from 'regiusmark';

@Module({
  name: 'root',
  namespaced: true,
})
export default class RootStore extends VuexModule {
  public password: string | null = null;
  public keyPair: KeyPair | null = null;

  @Mutation
  public setPassword(val: string): void {
    this.password = val;
  }

  @Mutation
  public setKeypair(val: KeyPair): void {
    this.keyPair = val;
  }
}
