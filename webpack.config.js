const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/walletconnect-bundle.js',
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: 'walletconnect-bundle.js',
    library: 'WalletConnect',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  resolve: {
    fallback: {
      "crypto": false,
      "stream": false,
      "util": false,
      "buffer": false,
      "process": false
    }
  },
  optimization: {
    minimize: true
  }
};
