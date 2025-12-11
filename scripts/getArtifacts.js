const fs = require('fs');
const path = require('path');

const artifactPath = path.join(__dirname, '../artifacts/contracts/FeeERC20.sol/FeeERC20.json');
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

console.log('=== ABI ===');
console.log(JSON.stringify(artifact.abi, null, 2));
console.log('\n=== BYTECODE ===');
console.log(artifact.bytecode);
