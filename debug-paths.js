const path = require('path');
const fs = require('fs');

console.log('🔍 Debugging file paths...\n');

// Get current working directory
const cwd = process.cwd();
console.log('Current working directory:', cwd);

// Get script directory
const scriptDir = __dirname;
console.log('Script directory:', scriptDir);

// Calculate expected paths
const projectRoot = path.resolve(scriptDir);
const publicDir = path.join(projectRoot, 'public');
const walletConnectFile = path.join(publicDir, 'wallet-connect.html');

console.log('\n📁 Calculated paths:');
console.log('Project root:', projectRoot);
console.log('Public directory:', publicDir);
console.log('Wallet connect file:', walletConnectFile);

// Check if directories exist
console.log('\n✅ Directory checks:');
console.log('Project root exists:', fs.existsSync(projectRoot));
console.log('Public directory exists:', fs.existsSync(publicDir));

// Check if files exist
console.log('\n📄 File checks:');
console.log('wallet-connect.html exists:', fs.existsSync(walletConnectFile));

// List public directory contents
if (fs.existsSync(publicDir)) {
  console.log('\n📋 Public directory contents:');
  const files = fs.readdirSync(publicDir);
  files.forEach(file => {
    const filePath = path.join(publicDir, file);
    const isFile = fs.statSync(filePath).isFile();
    const isDir = fs.statSync(filePath).isDirectory();
    console.log(`  ${isFile ? '📄' : isDir ? '📁' : '❓'} ${file}`);
  });
} else {
  console.log('\n❌ Public directory does not exist!');
}

// Check for alternative locations
console.log('\n🔍 Checking alternative locations:');
const alternatives = [
  path.join(cwd, 'public', 'wallet-connect.html'),
  path.join(cwd, 'src', 'public', 'wallet-connect.html'),
  path.join(scriptDir, '..', 'public', 'wallet-connect.html'),
  path.join(scriptDir, '..', '..', 'public', 'wallet-connect.html')
];

alternatives.forEach((altPath, index) => {
  console.log(`  ${index + 1}. ${altPath} - ${fs.existsSync(altPath) ? '✅ EXISTS' : '❌ NOT FOUND'}`);
});
