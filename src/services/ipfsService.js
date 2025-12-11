import { create } from 'ipfs-http-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import logger from '../utils/logger.js';

class IPFSService {
  constructor() {
    // Connect to your local IPFS node
    this.ipfs = create({
      host: '127.0.0.1',
      port: 5001,
      protocol: 'http'
    });
  }

  /**
   * Download image from Telegram and save to temporary file
   * @param {string} fileId - Telegram file ID
   * @param {string} botToken - Bot token for Telegram API
   * @returns {Promise<string>} Path to downloaded file
   */
  async downloadTelegramImage(fileId, botToken) {
    try {
      // Get file info from Telegram
      const fileInfoResponse = await axios.get(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
      
      if (!fileInfoResponse.data.ok) {
        throw new Error('Failed to get file info from Telegram');
      }

      const filePath = fileInfoResponse.data.result.file_path;
      const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

      // Download the file
      const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      
      // Create temporary file
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const fileExtension = path.extname(filePath) || '.jpg';
      const tempFilePath = path.join(tempDir, `${fileId}${fileExtension}`);
      
      fs.writeFileSync(tempFilePath, response.data);
      
      logger.info(`Downloaded Telegram image to: ${tempFilePath}`);
      return tempFilePath;
    } catch (error) {
      logger.error('Failed to download Telegram image:', error);
      throw error;
    }
  }

  /**
   * Upload image to IPFS and get CID
   * @param {string} filePath - Path to the image file
   * @returns {Promise<string>} IPFS CID
   */
  async uploadToIPFS(filePath) {
    try {
      logger.info(`Uploading to IPFS: ${filePath}`);
      
      const fileBuffer = fs.readFileSync(filePath);
      
      // Upload to IPFS with CID version 1 and pin
      const result = await this.ipfs.add(fileBuffer, {
        cidVersion: 1,
        pin: true
      });

      const cid = result.cid.toString();
      logger.info(`Image uploaded to IPFS with CID: ${cid}`);
      
      // Clean up temporary file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Cleaned up temporary file: ${filePath}`);
      }

      return cid;
    } catch (error) {
      logger.error('Failed to upload to IPFS:', error);
      throw error;
    }
  }

  /**
   * Process Telegram image: download → upload to IPFS → return CID
   * @param {string} fileId - Telegram file ID
   * @param {string} botToken - Bot token
   * @param {boolean} waitForPublic - Whether to wait for public accessibility
   * @returns {Promise<Object>} Image processing result
   */
  async processTelegramImage(fileId, botToken, waitForPublic = false) {
    try {
      logger.info(`Processing Telegram image with file ID: ${fileId}`);

      // Download from Telegram
      const tempFilePath = await this.downloadTelegramImage(fileId, botToken);

      // Upload to IPFS
      const cid = await this.uploadToIPFS(tempFilePath);

      const result = {
        success: true,
        cid: cid,
        ipfsUrl: `ipfs://${cid}`,
        publicUrl: `https://ipfs.io/ipfs/${cid}`,
        localUrl: `http://127.0.0.1:8080/ipfs/${cid}`,
        publicAccessible: false
      };

      // Check local accessibility first
      const localAccessible = await this.checkCIDAccessibility(cid);
      result.localAccessible = localAccessible;

      // Check or wait for public accessibility if requested
      if (waitForPublic) {
        result.publicAccessible = await this.waitForPublicAccessibility(cid);
      } else {
        result.publicAccessible = await this.checkPublicCIDAccessibility(cid);
      }

      logger.info(`Image processing complete. Public accessible: ${result.publicAccessible}`);
      return result;

    } catch (error) {
      logger.error('Failed to process Telegram image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test IPFS connectivity
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      const version = await this.ipfs.version();
      logger.info(`Connected to IPFS node version: ${version.version}`);
      return true;
    } catch (error) {
      logger.error('Failed to connect to IPFS:', error);
      return false;
    }
  }

  /**
   * Check if CID is accessible via local gateway
   * @param {string} cid - IPFS CID
   * @returns {Promise<boolean>} Accessibility status
   */
  async checkCIDAccessibility(cid) {
    try {
      const response = await axios.head(`http://127.0.0.1:8080/ipfs/${cid}`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      logger.warn(`CID ${cid} not accessible via local gateway yet:`, error.message);
      return false;
    }
  }

  /**
   * Check if CID is accessible via public ipfs.io gateway
   * @param {string} cid - IPFS CID
   * @returns {Promise<boolean>} Accessibility status
   */
  async checkPublicCIDAccessibility(cid) {
    try {
      const response = await axios.head(`https://ipfs.io/ipfs/${cid}`, {
        timeout: 10000
      });
      return response.status === 200;
    } catch (error) {
      logger.warn(`CID ${cid} not accessible via public gateway yet:`, error.message);
      return false;
    }
  }

  /**
   * Get network information and peer count
   * @returns {Promise<Object>} Network info
   */
  async getNetworkInfo() {
    try {
      const peers = await this.ipfs.swarm.peers();
      let peerId = 'unknown';
      let addresses = [];

      try {
        const id = await this.ipfs.id();
        peerId = id.id;
        addresses = id.addresses || [];
      } catch (idError) {
        logger.warn('Could not get peer ID:', idError.message);
      }

      return {
        peerCount: peers.length,
        peerId: peerId,
        addresses: addresses
      };
    } catch (error) {
      logger.warn('Failed to get network info:', error.message);
      // Return basic info even if there's an error
      return {
        peerCount: 0,
        peerId: 'unknown',
        addresses: [],
        error: error.message
      };
    }
  }

  /**
   * Wait for CID to be accessible on public gateway
   * @param {string} cid - IPFS CID
   * @param {number} maxAttempts - Maximum attempts to check
   * @param {number} delayMs - Delay between attempts
   * @returns {Promise<boolean>} Success status
   */
  async waitForPublicAccessibility(cid, maxAttempts = 10, delayMs = 3000) {
    logger.info(`Waiting for CID ${cid} to be accessible on public gateway...`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      logger.info(`Attempt ${attempt}/${maxAttempts}...`);

      const isAccessible = await this.checkPublicCIDAccessibility(cid);
      if (isAccessible) {
        logger.info(`✅ CID ${cid} is now accessible on public gateway!`);
        return true;
      }

      if (attempt < maxAttempts) {
        logger.info(`⏳ Waiting ${delayMs}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    logger.warn(`⚠️ CID ${cid} not accessible on public gateway after ${maxAttempts} attempts`);
    return false;
  }
}

export default IPFSService;
