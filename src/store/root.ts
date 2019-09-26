import { Module, Mutation, VuexModule } from 'vuex-module-decorators';
import { KeyPair } from 'godcoin';

@Module({
  name: 'root',
  namespaced: true,
})
export default class RootStore extends VuexModule {
  public password: string | null = null;
  public keyPair: KeyPair | null = null;
  public dbKey = null;

  @Mutation
  public setPassword(val: string): void {
    this.password = val;
  }

  @Mutation
  public setKeypair(val: KeyPair): void {
    this.keyPair = val;
  }

  @Mutation
  public reset(): void {
    this.password = null;
    this.keyPair = null;
  }
}
