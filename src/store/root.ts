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
  public setPassword(val: string | null): void {
    this.password = val;
  }

  @Mutation
  public setKeypair(val: KeyPair | null): void {
    this.keyPair = val;
  }
}
