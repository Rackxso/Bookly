const fs = require('fs');
const path = require('path');

const envDir = path.join(__dirname, 'front/src/environments');
fs.mkdirSync(envDir, { recursive: true });

fs.writeFileSync(path.join(envDir, 'environment.ts'), `export const environment = {
  production: false,
  apiUrl: '',
  googleBooksApiKey: '',
};
`);

fs.writeFileSync(path.join(envDir, 'environment.production.ts'), `export const environment = {
  production: true,
  apiUrl: 'https://bookly-sable.vercel.app',
  googleBooksApiKey: '${process.env.GOOGLE_BOOKS_API_KEY || ''}',
};
`);

console.log('Environment files generated.');
