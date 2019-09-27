import { WalletDb } from './index';
import { Logger } from '../../log';
import util from 'util';

const log = new Logger('db:migrations');

interface MigrationData {
  id: number;
  version: number;
}

export async function runMigrations(db: WalletDb): Promise<void> {
  const migTblName = 'migrations';

  const data = await (async (): Promise<MigrationData> => {
    const tbl = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [migTblName]);
    const exists = tbl !== undefined && tbl.name === migTblName;
    if (exists) {
      return await db.get(`SELECT * FROM ${migTblName}`);
    } else {
      return {
        id: 0,
        version: 0,
      };
    }
  })();

  log.info('Current database version:', data.version);

  switch (data.version) {
    case 0:
      // Upgrade to version 1
      await db.run(`CREATE TABLE ${migTblName}(id INTEGER PRIMARY KEY UNIQUE CHECK(id == 0), version INTEGER)`);
      await db.run(`INSERT INTO ${migTblName}(id, version) VALUES(?, ?)`, [0, 1]);
      log.info('Upgraded database version to 1');
    /* fall through */
    case 1:
      // Only the last valid case should break for continuous upgrading of the database
      break;
    default:
      throw new Error('upgrade failed to handle version: ' + util.inspect(data));
  }
}
