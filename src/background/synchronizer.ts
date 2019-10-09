import { BodyType, ScriptHash, Block, BlockHeader, SigPair } from 'godcoin';
import { getClient } from './client';
import { Logger } from '../log';
import Long from 'long';

let log = new Logger('main:chain_synchronizer');
let instance: ChainSynchronizer;

class ChainSynchronizer {
  private readonly watchAddrs: ScriptHash[];

  private currentHeight = Long.fromNumber(0, true);
  private pendingBlocks: Block[] = [];
  private synchronizing = false;

  public constructor(watchAddrs: ScriptHash[]) {
    this.watchAddrs = watchAddrs;

    const client = getClient();
    if (client.isOpen()) {
      this.start();
    }

    client.on('open', (): void => {
      this.start();
    });

    client.on('sub_msg', (res): void => {
      if (res.type === BodyType.GetBlock) {
        const block = res.block as Block;
        if (this.synchronizing) {
          this.pendingBlocks.push(block);
        } else {
          log.info('Received block update:', block.block.header.height.toString());
          this.applyBlock(block);
        }
      }
    });
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
        this.applyBlock(block);

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
          this.applyBlock(block);
        }
        this.pendingBlocks = [];
      }

      log.info('Synchronization completed:', this.currentHeight.toString());
    } catch (e) {
      log.error('Failure during the synchronization process:', e);
    } finally {
      this.synchronizing = false;
    }
  }

  private applyBlock(block: [BlockHeader, SigPair] | Block): void {
    // TODO: store in the database
    if (block instanceof Block) {
      this.currentHeight = block.block.header.height;
    } else {
      // Block header + signature (no relevant transactions)
      this.currentHeight = block[0].header.height;
    }
  }
}

export function initSynchronizer(watchAddrs: ScriptHash[]): void {
  if (getClient() === undefined) throw new Error('client not initialized');
  if (instance !== undefined) throw new Error('synchronizer already initialized');
  instance = new ChainSynchronizer(watchAddrs);
}
