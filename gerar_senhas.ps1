cd server
npm install
node -e "
const b = require('bcryptjs');
const h1 = b.hashSync('Admin@123', 10);
const h2 = b.hashSync('Estag@123', 10);
const h3 = b.hashSync('Pac@123', 10);
console.log('Admin:', h1);
console.log('Estag:', h2);
console.log('Pac:',   h3);
"