const cron = require('node-cron');
const fs = require('fs');
const crypto = require('crypto');
const simpleGit = require('simple-git')();

const { GITHUB_USER, GITHUB_EMAIL, REPO_URL, JSON_PATH } = process.env;

// Encryption helper
function encryptJSON(json) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync('super-secret-password', 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(json)), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Cron: every day at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Running midnight backup job...');
    const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
    const encrypted = encryptJSON(data);
    fs.writeFileSync(JSON_PATH, encrypted, 'utf-8');

    await simpleGit
      .addConfig('user.name', GITHUB_USER)
      .addConfig('user.email', GITHUB_EMAIL)
      .add(JSON_PATH)
      .commit(`Auto backup ${new Date().toISOString()}`)
      .push(REPO_URL, 'main');

    console.log('Backup pushed to GitHub successfully!');
  } catch (err) {
    console.error('Error in cron job:', err);
  }
});

console.log('Backend running. Cron job scheduled.');