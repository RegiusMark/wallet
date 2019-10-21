import {
  BodyType,
  ScriptHash,
  Block,
  BlockHeader,
  SigPair,
  TxVariant,
  MintTxV0,
  RewardTxV0,
  TransferTxV0,
  OwnerTxV0,
  Asset,
} from 'godcoin';
import { WalletDb, KvTable, TxsTable } from './db';
import { getClient } from './client';
import { Logger } from '../log';
import Big from 'big.js';
import Long from 'long';

let log = new Logger('main:chain_synchronizer');
let instance: ChainSynchronizer;

class ChainSynchronizer {
  private readonly watchAddrs: ScriptHash[];
  private currentHeight: Long;

  private pendingBlocks: Block[] = [];
  private synchronizing = false;

  public constructor(watchAddrs: ScriptHash[], syncHeight: Long) {
    if (!syncHeight.unsigned) throw new Error('syncHeight must be unsigned');
    this.currentHeight = syncHeight;
    this.watchAddrs = watchAddrs;

    const client = getClient();
    if (client.isOpen()) {
      this.start();
    }

    client.on('open', (): void => {
      this.start();
    });

    client.on(
      'sub_msg',
      async (res): Promise<void> => {
        if (res.type === BodyType.GetBlock) {
          const block = res.block as Block;
          if (this.synchronizing) {
            this.pendingBlocks.push(block);
          } else {
            log.info('Received block update:', block.block.header.height.toString());
            try {
              const updateBal = await this.applyBlock(block);
              if (updateBal) {
                await this.updateTotalBalance();
              }
              await this.updateIndex();
            } catch (e) {
              log.error('Failed to handle incoming block\n', block, e);
            }
          }
        }
      },
    );
  }

  private async start(): Promise<void> {
    if (this.synchronizing) return;
    log.info('Starting synchronization process');
    this.synchronizing = true;
    try {
      const client = getClient();

      // Subscribe to new blocks.
      await client.sendReq({
        type: BodyType.Subscribe,
      });

      // Configure the filter.
      await client.sendReq({
        type: BodyType.SetBlockFilter,
        addrs: this.watchAddrs,
      });

      // Get the current height that we will sync up to. Any missed blocks will be in the pending queue.
      const chainPropsBody = await client.sendReq({
        type: BodyType.GetProperties,
      });
      if (chainPropsBody.type !== BodyType.GetProperties) throw new Error('expected GetProperties response');
      const height = chainPropsBody.properties.height;

      // Start retrieving blocks and apply them.
      while (this.currentHeight.lt(height)) {
        const blockBody = await client.sendReq({
          type: BodyType.GetBlock,
          height: this.currentHeight.add(1),
        });
        if (blockBody.type !== BodyType.GetBlock) throw new Error('expected GetBlock response');

        const block = blockBody.block;
        await this.applyBlock(block);

        if (this.currentHeight.mod(10000).eq(0)) {
          log.info('Current sync height:', this.currentHeight.toString());
        }
      }

      {
        // Apply any pending blocks received from block subscription updates while we were previously synchronizing
        // up to the currently known height. There is no race condition even if blocks are pushed during iteration
        // as the loop will still iterate over new blocks regardless if the body waits for promises to finish.
        for (const block of this.pendingBlocks) {
          log.info('Applying pending block:', block.block.header.height.toString());
          await this.applyBlock(block);
        }
        this.pendingBlocks = [];
      }

      await this.updateIndex();
      await this.updateTotalBalance();
      log.info('Synchronization completed:', this.currentHeight.toString());
    } catch (e) {
      log.error('Failure during the synchronization process:', e);
    } finally {
      this.synchronizing = false;
    }
  }

  private async applyBlock(block: [BlockHeader, SigPair] | Block): Promise<boolean> {
    // Whether or not the applied block matches a watched address
    let match = false;
    let height: Long;

    if (block instanceof Block) {
      height = block.block.header.height;
      const txsTable = WalletDb.getInstance().getTable(TxsTable);
      for (const wrapper of block.block.transactions) {
        const hasMatch = this.txHasMatch(wrapper);
        if (hasMatch) {
          // TODO emit an event to the renderer with the full tx
          match = true;
          await txsTable.insert(wrapper);
        }
      }
    } else {
      // Block header + signature (no relevant transactions)
      height = block[0].header.height;
    }

    if (!this.currentHeight.add(1).eq(height)) {
      log.error('Missed block:', this.currentHeight.toString);
    }
    this.currentHeight = height;

    return match;
  }

  private txHasMatch(txVariant: TxVariant): boolean {
    const tx = txVariant.tx;
    if (tx instanceof OwnerTxV0) {
      return this.isWatched(tx.minter.toScript().hash()) || this.isWatched(tx.script.hash());
    } else if (tx instanceof MintTxV0) {
      return this.isWatched(tx.to);
    } else if (tx instanceof RewardTxV0) {
      return this.isWatched(tx.to);
    } else if (tx instanceof TransferTxV0) {
      return this.isWatched(tx.from) || this.isWatched(tx.to);
    }
    const _exhaustiveCheck: never = tx;
    throw new Error('exhaustive check failed tx: ' + _exhaustiveCheck);
  }

  private isWatched(addr: ScriptHash): boolean {
    const index = this.watchAddrs.findIndex(watchAddr => {
      return Buffer.compare(addr.bytes, watchAddr.bytes) === 0;
    });
    return index > -1;
  }

  private async updateIndex(): Promise<void> {
    const store = WalletDb.getInstance().getTable(KvTable);
    await store.setSyncHeight(this.currentHeight);
  }

  private async updateTotalBalance(): Promise<void> {
    const proms = [];
    for (const addr of this.watchAddrs) {
      proms.push(getClient().sendReq({
        type: BodyType.GetAddressInfo,
        addr
      }));
    }
    const responses = await Promise.all(proms);
    let totalBal = new Asset(Big(0));
    for (const res of responses) {
      if (res.type !== BodyType.GetAddressInfo) throw new Error('unexpected RPC response: ' + res.type);
      totalBal = totalBal.add(res.info.balance);
    }

    const store = WalletDb.getInstance().getTable(KvTable);
    await store.setTotalBalance(totalBal);
  }
}

export async function initSynchronizer(watchAddrs: ScriptHash[]): Promise<void> {
  if (getClient() === undefined) throw new Error('client not initialized');

  let syncHeight = await WalletDb.getInstance()
    .getTable(KvTable)
    .getSyncHeight();
  if (!syncHeight) syncHeight = Long.fromNumber(0, true);

  if (instance !== undefined) throw new Error('synchronizer already initialized');
  instance = new ChainSynchronizer(watchAddrs, syncHeight);
}
