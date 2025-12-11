import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

class WalletServer {
  constructor(port = 3000) {
    this.port = port;
    this.app = express();
    this.walletConnections = new Map(); // Store wallet connection data
    this.setupRoutes();
  }

  setupRoutes() {
    // Get the project root directory
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const projectRoot = path.resolve(__dirname, '../../');
    const publicDir = path.join(projectRoot, 'public');
    
    // Serve static files
    this.app.use(express.static(publicDir));
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    // Wallet connection route - serve the HTML file
    this.app.get('/wallet-connect', (req, res) => {
      const filePath = path.join(publicDir, 'wallet-connect.html');
      logger.info(`Serving wallet-connect.html from: ${filePath}`);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        logger.error(`File not found: ${filePath}`);
        return res.status(404).json({ 
          error: 'Wallet connection page not found',
          path: filePath,
          publicDir: publicDir
        });
      }
      
      res.sendFile(filePath);
    });
    
    // Wallet connection with query parameters
    this.app.get('/wallet-connect.html', (req, res) => {
      const filePath = path.join(publicDir, 'wallet-connect.html');
      logger.info(`Serving wallet-connect.html from: ${filePath}`);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        logger.error(`File not found: ${filePath}`);
        return res.status(404).json({ 
          error: 'Wallet connection page not found',
          path: filePath,
          publicDir: publicDir
        });
      }
      
      res.sendFile(filePath);
    });
    
    // Wallet connection callback endpoint
    this.app.post('/wallet/callback', express.json(), (req, res) => {
      const { address, wallet, sessionId } = req.body;
      
      logger.info('Wallet connection callback:', { address, wallet, sessionId });
      
      // TODO: Store wallet connection in database
      // TODO: Notify bot about successful connection
      
      res.json({ success: true, message: 'Wallet connected successfully' });
    });
    
    // New wallet callback endpoint for web app fallback
    this.app.post('/wallet-callback', express.json(), (req, res) => {
      const { walletAddress, walletConnected, wallet } = req.body;
      const { telegramId } = req.query;
      
      logger.info('Wallet callback received:', { 
        telegramId, 
        walletAddress, 
        walletConnected, 
        wallet 
      });
      
      // Store the wallet connection data
      if (telegramId) {
        this.walletConnections.set(telegramId, {
          walletAddress,
          walletConnected,
          wallet,
          timestamp: Date.now()
        });
        logger.info(`Stored wallet connection for telegramId: ${telegramId}`);
      }
      
      res.json({ 
        success: true, 
        message: 'Wallet connection data received',
        telegramId: telegramId
      });
    });
    
    // Endpoint to check for wallet connection data
    this.app.get('/wallet-status/:telegramId', (req, res) => {
      const { telegramId } = req.params;
      const connectionData = this.walletConnections.get(telegramId);
      
      if (connectionData) {
        // Remove the data after retrieving it (one-time use)
        this.walletConnections.delete(telegramId);
        res.json({ 
          success: true, 
          data: connectionData 
        });
      } else {
        res.json({ 
          success: false, 
          message: 'No wallet connection data found' 
        });
      }
    });
    
    // Error handling
    this.app.use((err, req, res, next) => {
      logger.error('Wallet server error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, (err) => {
        if (err) {
          reject(err);
        } else {
          logger.info(`Wallet server started on port ${this.port}`);
          resolve();
        }
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(resolve);
      } else {
        resolve();
      }
    });
  }
  
  // Method to get wallet connection data
  getWalletConnection(telegramId) {
    return this.walletConnections.get(telegramId);
  }
  
  // Method to remove wallet connection data
  removeWalletConnection(telegramId) {
    return this.walletConnections.delete(telegramId);
  }
}

export default WalletServer;
