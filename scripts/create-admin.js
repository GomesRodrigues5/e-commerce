require('dotenv').config();
const pool = require('../src/db/pool');
const { hashPassword } = require('../src/services/adminCredentials');

async function createAdmin() {
  const name = String(process.env.ADMIN_NAME || '').trim();
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 12) {
    throw new Error('Configure ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASSWORD (mínimo 12 caracteres) no .env.');
  }

  const passwordHash = await hashPassword(password);
  const [result] = await pool.execute(
    'INSERT IGNORE INTO admins (name, email, password_hash) VALUES (?, ?, ?)',
    [name, email, passwordHash]
  );
  if (result.affectedRows === 0) {
    console.log(`Já existe uma conta administrativa para ${email}; nenhum registo foi alterado.`);
    return;
  }
  console.log(`Administrador ${email} criado.`);
}

createAdmin()
  .catch(error => {
    console.error('Não foi possível criar o administrador:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());