import path from 'path';
import fs from 'fs';
import constants from '../config/constants.js';
import logger from '../utils/logger.js';

class DatabaseService {
  constructor() {
    this.dbPath = constants.DB_PATH;
    this.db = null;
  }

  async initialize() {
    try {
      // Dynamic import for sqlite3 to handle ES modules
      const sqlite3 = await import('sqlite3');
      const { Database } = sqlite3.default;
      
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = new Database(this.dbPath);
      
      await this.createTables();
      await this.migrateTables();
      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      const tables = [
        `CREATE TABLE IF NOT EXISTS tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          username TEXT,
          token_name TEXT NOT NULL,
          token_symbol TEXT NOT NULL,
          token_address TEXT UNIQUE NOT NULL,
          trading_fee REAL NOT NULL,
          logo_url TEXT,
          wallet_address TEXT NOT NULL,
          deployment_tx_hash TEXT,
          deployment_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          initial_market_cap REAL,
          total_volume REAL DEFAULT 0,
          total_fees REAL DEFAULT 0,
          status TEXT DEFAULT 'deployed'
        )`,
        
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          telegram_id INTEGER UNIQUE NOT NULL,
          username TEXT,
          first_name TEXT,
          last_name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          total_tokens_deployed INTEGER DEFAULT 0
        )`,
        
        `CREATE TABLE IF NOT EXISTS fee_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          token_address TEXT NOT NULL,
          amount REAL NOT NULL,
          creator_reward REAL NOT NULL,
          team_reward REAL NOT NULL,
          clanker_reward REAL NOT NULL,
          tx_hash TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (token_address) REFERENCES tokens (token_address)
        )`,
        
        `CREATE TABLE IF NOT EXISTS deployment_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          telegram_id INTEGER NOT NULL,
          step TEXT NOT NULL,
          token_name TEXT,
          token_symbol TEXT,
          trading_fee REAL,
          logo_url TEXT,
          wallet_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )`,

        `CREATE TABLE IF NOT EXISTS token_drafts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          telegram_id INTEGER NOT NULL UNIQUE,
          step TEXT NOT NULL,
          token_name TEXT,
          token_symbol TEXT,
          image_url TEXT,
          image_file_id TEXT,
          image_cid TEXT,
          description TEXT,
          creator_buy_in_eth REAL,
          user_wallet_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      ];

      let completed = 0;
      tables.forEach((table, index) => {
        this.db.run(table, (err) => {
          if (err) {
            logger.error(`Failed to create table ${index}:`, err);
            reject(err);
            return;
          }
          completed++;
          if (completed === tables.length) {
            resolve();
          }
        });
      });
    });
  }

  async migrateTables() {
    return new Promise((resolve, reject) => {
      // Add missing columns to existing tables
      const migrations = [
        // Add user_wallet_address column to token_drafts if it doesn't exist
        `ALTER TABLE token_drafts ADD COLUMN user_wallet_address TEXT`,
        // Add image_file_id column to token_drafts if it doesn't exist
        `ALTER TABLE token_drafts ADD COLUMN image_file_id TEXT`,
        // Add image_cid column to token_drafts if it doesn't exist
        `ALTER TABLE token_drafts ADD COLUMN image_cid TEXT`
      ];

      let completed = 0;
      migrations.forEach((migration, index) => {
        this.db.run(migration, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            // Ignore "duplicate column name" errors as the column might already exist
            console.log(`Migration ${index + 1} skipped (column already exists):`, err.message);
          } else if (err) {
            console.log(`Migration ${index + 1} error:`, err.message);
          } else {
            console.log(`Migration ${index + 1} completed successfully`);
          }
          
          completed++;
          if (completed === migrations.length) {
            resolve();
          }
        });
      });
    });
  }

  async createUser(telegramId, username, firstName, lastName) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT OR IGNORE INTO users (telegram_id, username, first_name, last_name)
        VALUES (?, ?, ?, ?)
      `;
      
      this.db.run(query, [telegramId, username, firstName, lastName], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async getUser(telegramId) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE telegram_id = ?';
      this.db.get(query, [telegramId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async createDeploymentSession(telegramId, step, data = {}) {
    try {
      let user = await this.getUser(telegramId);
      if (!user) {
        const userId = await this.createUser(telegramId, data.username, data.firstName, data.lastName);
        user = { id: userId };
      }

      return new Promise((resolve, reject) => {
        const query = `
          INSERT OR REPLACE INTO deployment_sessions 
          (user_id, telegram_id, step, token_name, token_symbol, trading_fee, logo_url, wallet_address, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        
        this.db.run(query, [
          user.id,
          telegramId,
          step,
          data.tokenName || null,
          data.tokenSymbol || null,
          data.tradingFee || null,
          data.logoUrl || null,
          data.walletAddress || null
        ], function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        });
      });
    } catch (error) {
      logger.error('Failed to create deployment session:', error);
      throw error;
    }
  }

  async getDeploymentSession(telegramId) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM deployment_sessions WHERE telegram_id = ? ORDER BY updated_at DESC LIMIT 1';
      this.db.get(query, [telegramId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async upsertTokenDraft(telegramId, draft) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO token_drafts (
          telegram_id, step, token_name, token_symbol, image_url, image_file_id, image_cid, description, creator_buy_in_eth, user_wallet_address, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(telegram_id) DO UPDATE SET
          step=excluded.step,
          token_name=excluded.token_name,
          token_symbol=excluded.token_symbol,
          image_url=excluded.image_url,
          image_file_id=excluded.image_file_id,
          image_cid=excluded.image_cid,
          description=excluded.description,
          creator_buy_in_eth=excluded.creator_buy_in_eth,
          user_wallet_address=excluded.user_wallet_address,
          updated_at=CURRENT_TIMESTAMP
      `;

      this.db.run(query, [
        telegramId,
        draft.step,
        draft.tokenName || null,
        draft.tokenSymbol || null,
        draft.imageUrl || null,
        draft.imageFileId || null,
        draft.imageCid || null,
        draft.description || null,
        draft.creatorBuyInEth != null ? draft.creatorBuyInEth : null,
        draft.userWalletAddress || null
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async getTokenDraft(telegramId) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM token_drafts WHERE telegram_id = ? LIMIT 1';
      this.db.get(query, [telegramId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async deleteTokenDraft(telegramId) {
    return new Promise((resolve, reject) => {
      const query = 'DELETE FROM token_drafts WHERE telegram_id = ?';
      this.db.run(query, [telegramId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  async saveToken(tokenData) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO tokens (
          user_id, username, token_name, token_symbol, token_address, trading_fee,
          logo_url, wallet_address, deployment_tx_hash, initial_market_cap
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(query, [
        tokenData.userId,
        tokenData.username,
        tokenData.tokenName,
        tokenData.tokenSymbol,
        tokenData.tokenAddress,
        tokenData.tradingFee,
        tokenData.logoUrl,
        tokenData.walletAddress,
        tokenData.deploymentTxHash,
        tokenData.initialMarketCap
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async getTokensByUser(telegramId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT t.* FROM tokens t
        JOIN users u ON t.user_id = u.id
        WHERE u.telegram_id = ?
        ORDER BY t.deployment_time DESC
      `;
      
      this.db.all(query, [telegramId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getAllTokens() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT t.*, u.username FROM tokens t
        JOIN users u ON t.user_id = u.id
        ORDER BY t.deployment_time DESC
      `;
      
      this.db.all(query, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async updateTokenStats(tokenAddress, volume, fees) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE tokens 
        SET total_volume = total_volume + ?, total_fees = total_fees + ?
        WHERE token_address = ?
      `;
      
      this.db.run(query, [volume, fees, tokenAddress], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  async recordFeeEvent(feeData) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO fee_events (
          token_address, amount, creator_reward, team_reward, clanker_reward, tx_hash
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(query, [
        feeData.tokenAddress,
        feeData.amount,
        feeData.creatorReward,
        feeData.teamReward,
        feeData.clankerReward,
        feeData.txHash
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async getTokenStats() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          COUNT(*) as total_tokens,
          SUM(total_volume) as total_volume,
          SUM(total_fees) as total_fees,
          AVG(trading_fee) as avg_trading_fee
        FROM tokens
      `;
      
      this.db.get(query, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async close() {
    if (this.db) {
      this.db.close();
    }
  }
}

export default DatabaseService; 