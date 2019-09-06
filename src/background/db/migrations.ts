import { WalletDb } from './index';
import util from 'util';

interface MigrationData {
  id: number,
  version: number,
}

export async function runMigrations(db: WalletDb): Promise<void> {
  const migTblName = 'migrations';
  const tbl = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [migTblName]);
  const exists = tbl !== undefined && tbl.name === migTblName;
  if (!exists) {
    await db.run(`CREATE TABLE ${migTblName}(id INTEGER PRIMARY KEY, version INTEGER)`);
    await db.run(`INSERT INTO ${migTblName}(id, version) VALUES(?, ?)`, [0, 0]);
  }

  const data: MigrationData = await db.get(`SELECT * FROM ${migTblName}`);
  switch (data.version) {
    case 0:
      // Upgrade to version 1
      await db.run(`UPDATE ${migTblName} SET version = $version WHERE id = $id`, {
        $id: data.id,
        $version: 1,
      });
    /* fall through */
    case 1:
      // Only the last valid case should break for continuous upgrading of the database
      break;
    default:
      throw new Error('upgrade failed to handle version: ' + util.inspect(data));
  }
}
