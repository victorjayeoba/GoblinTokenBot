import constants from '../config/constants.js';

class Validator {
  /**
   * Validate token name
   * @param {string} name - Token name to validate
   * @returns {Object} Validation result
   */
  static validateTokenName(name) {
    if (!name || typeof name !== 'string') {
      return {
        isValid: false,
        error: 'Token name is required'
      };
    }

    if (name.length < 3) {
      return {
        isValid: false,
        error: 'Token name must be at least 3 characters long'
      };
    }

    if (name.length > 50) {
      return {
        isValid: false,
        error: 'Token name must be 50 characters or less'
      };
    }

    // Check for valid characters (letters, numbers, spaces, hyphens, underscores)
    const validNameRegex = /^[a-zA-Z0-9\s\-_]+$/;
    if (!validNameRegex.test(name)) {
      return {
        isValid: false,
        error: 'Token name can only contain letters, numbers, spaces, hyphens, and underscores'
      };
    }

    return {
      isValid: true,
      error: null
    };
  }

  /**
   * Validate token symbol
   * @param {string} symbol - Token symbol to validate
   * @returns {Object} Validation result
   */
  static validateTokenSymbol(symbol) {
    if (!symbol || typeof symbol !== 'string') {
      return {
        isValid: false,
        error: 'Token symbol is required'
      };
    }

    if (symbol.length < 2) {
      return {
        isValid: false,
        error: 'Token symbol must be at least 2 characters long'
      };
    }

    if (symbol.length > 10) {
      return {
        isValid: false,
        error: 'Token symbol must be 10 characters or less'
      };
    }

    // Check for valid characters (letters and numbers only)
    const validSymbolRegex = /^[a-zA-Z0-9]+$/;
    if (!validSymbolRegex.test(symbol)) {
      return {
        isValid: false,
        error: 'Token symbol can only contain letters and numbers'
      };
    }

    return {
      isValid: true,
      error: null
    };
  }

  /**
   * Validate trading fee
   * @param {string|number} fee - Trading fee to validate
   * @returns {Object} Validation result
   */
  static validateTradingFee(fee) {
    if (!fee && fee !== 0) {
      return {
        isValid: false,
        error: 'Trading fee is required'
      };
    }

    const numericFee = parseFloat(fee);
    if (isNaN(numericFee)) {
      return {
        isValid: false,
        error: 'Trading fee must be a valid number'
      };
    }

    if (numericFee < constants.MIN_TRADING_FEE) {
      return {
        isValid: false,
        error: `Trading fee must be at least ${constants.MIN_TRADING_FEE}%`
      };
    }

    if (numericFee > constants.MAX_TRADING_FEE) {
      return {
        isValid: false,
        error: `Trading fee must be ${constants.MAX_TRADING_FEE}% or less`
      };
    }

    return {
      isValid: true,
      error: null,
      value: numericFee
    };
  }

  /**
   * Validate wallet address
   * @param {string} address - Wallet address to validate
   * @returns {Object} Validation result
   */
  static validateWalletAddress(address) {
    if (!address || typeof address !== 'string') {
      return {
        isValid: false,
        error: 'Wallet address is required'
      };
    }

    // Basic Ethereum address format validation
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(address)) {
      return {
        isValid: false,
        error: 'Invalid wallet address format'
      };
    }

    return {
      isValid: true,
      error: null
    };
  }

  /**
   * Validate ETH amount
   * @param {string|number} amount - ETH amount to validate
   * @returns {Object} Validation result
   */
  static validateEthAmount(amount) {
    if (!amount && amount !== 0) {
      return {
        isValid: false,
        error: 'ETH amount is required'
      };
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
      return {
        isValid: false,
        error: 'ETH amount must be a valid number'
      };
    }

    if (numericAmount <= 0) {
      return {
        isValid: false,
        error: 'ETH amount must be greater than 0'
      };
    }

    const minRequiredEth = (parseFloat(constants.MIN_CONTRACT_DEV_BUY_ETH || '0.01') + parseFloat(constants.GAS_RESERVE_ETH || '0.015'));
    if (numericAmount < minRequiredEth) {
      return {
        isValid: false,
        error: `ETH amount must be at least ${minRequiredEth} ETH`
      };
    }

    return {
      isValid: true,
      error: null,
      value: numericAmount
    };
  }

  /**
   * Validate Telegram user ID
   * @param {string|number} userId - Telegram user ID to validate
   * @returns {Object} Validation result
   */
  static validateTelegramUserId(userId) {
    if (!userId && userId !== 0) {
      return {
        isValid: false,
        error: 'Telegram user ID is required'
      };
    }

    const numericUserId = parseInt(userId);
    if (isNaN(numericUserId)) {
      return {
        isValid: false,
        error: 'Telegram user ID must be a valid number'
      };
    }

    if (numericUserId <= 0) {
      return {
        isValid: false,
        error: 'Telegram user ID must be positive'
      };
    }

    return {
      isValid: true,
      error: null,
      value: numericUserId
    };
  }

  /**
   * Validate deployment configuration
   * @param {Object} config - Deployment configuration to validate
   * @returns {Object} Validation result
   */
  static validateDeploymentConfig(config) {
    const errors = [];

    // Validate required fields
    if (!config.tokenName) {
      errors.push('Token name is required');
    } else {
      const nameValidation = this.validateTokenName(config.tokenName);
      if (!nameValidation.isValid) {
        errors.push(nameValidation.error);
      }
    }

    if (!config.tokenSymbol) {
      errors.push('Token symbol is required');
    } else {
      const symbolValidation = this.validateTokenSymbol(config.tokenSymbol);
      if (!symbolValidation.isValid) {
        errors.push(symbolValidation.error);
      }
    }

    if (!config.tradingFee && config.tradingFee !== 0) {
      errors.push('Trading fee is required');
    } else {
      const feeValidation = this.validateTradingFee(config.tradingFee);
      if (!feeValidation.isValid) {
        errors.push(feeValidation.error);
      }
    }

    if (!config.walletAddress) {
      errors.push('Wallet address is required');
    } else {
      const addressValidation = this.validateWalletAddress(config.walletAddress);
      if (!addressValidation.isValid) {
        errors.push(addressValidation.error);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize user input and ensure ASCII compatibility
   * @param {string} input - Input to sanitize
   * @returns {string} Sanitized input
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') {
      return '';
    }

    // Remove HTML tags and dangerous characters
    let sanitized = input
      .replace(/<[^>]*>/g, '')
      .replace(/[<>]/g, '')
      .trim();

    // Ensure ASCII compatibility - replace non-ASCII characters
    sanitized = sanitized
      .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    return sanitized;
  }

  /**
   * Validate image file
   * @param {Object} file - File object to validate
   * @returns {Object} Validation result
   */
  static validateImageFile(file) {
    if (!file) {
      return {
        isValid: false,
        error: 'No file provided'
      };
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.file_size && file.file_size > maxSize) {
      return {
        isValid: false,
        error: 'File size must be 5MB or less'
      };
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (file.mime_type && !allowedTypes.includes(file.mime_type)) {
      return {
        isValid: false,
        error: 'Only JPG, PNG, and GIF files are allowed'
      };
    }

    return {
      isValid: true,
      error: null
    };
  }
}

export default Validator; 