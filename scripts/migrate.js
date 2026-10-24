require('dotenv').config();
const fs = require('node:fs/promises');
const path = require('node:path');
const pool = require('../src/db/pool');
const { syncAngolaLocations } = require('../src/services/angolaLocations');

async function migrate() {
  const migrationsDirectory = path.join(__dirname, '..', 'db', 'migrations');
  const createAdmins = await fs.readFile(path.join(migrationsDirectory, '001_create_admins.sql'), 'utf8');
  await pool.query(createAdmins);

  const [subjectColumn] = await pool.execute(`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'contact_messages' AND column_name = 'subject'
    LIMIT 1
  `);
  if (!subjectColumn.length) {
    const addContactSubject = await fs.readFile(path.join(migrationsDirectory, '002_add_contact_subject.sql'), 'utf8');
    await pool.query(addContactSubject);
    console.log('Migration 002_add_contact_subject aplicada.');
  } else {
    console.log('Migration 002_add_contact_subject: coluna já existe.');
  }
  for (const [column, definition] of [
    ['password_hash', 'VARCHAR(255) NULL'],
    ['province', 'VARCHAR(100) NULL'],
    ['municipality', 'VARCHAR(120) NULL']
  ]) {
    const [existing] = await pool.execute(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'customers' AND column_name = ?
      LIMIT 1
    `, [column]);
    if (!existing.length) {
      await pool.query(`ALTER TABLE customers ADD COLUMN ${column} ${definition}`);
      console.log(`Coluna customers.${column} adicionada.`);
    }
  }
  const [orderType] = await pool.execute(`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'order_type'
    LIMIT 1
  `);
  if (!orderType.length) {
    await pool.query(`ALTER TABLE orders
      ADD COLUMN order_type ENUM('PURCHASE','RESERVATION') NOT NULL DEFAULT 'PURCHASE',
      ADD COLUMN reservation_expires_at DATETIME NULL`);
  }
  await pool.query(`ALTER TABLE orders MODIFY COLUMN status
    ENUM('PENDING','PAYMENT_PENDING','PAID','PROCESSING','SHIPPED','DELIVERED','CANCELLED','FAILED','RESERVED')
    NOT NULL DEFAULT 'PENDING'`);
  const createCustomerAccounts = await fs.readFile(
    path.join(migrationsDirectory, '003_customer_accounts_and_ads.sql'),
    'utf8'
  );
  for (const statement of createCustomerAccounts.split(';').map(value => value.trim()).filter(Boolean)) {
    await pool.query(statement);
  }
  await pool.execute(`INSERT IGNORE INTO angola_provinces (name) VALUES
    ('Bengo'), ('Benguela'), ('Bié'), ('Cabinda'), ('Cuando'), ('Cubango'),
    ('Cuanza Norte'), ('Cuanza Sul'), ('Cunene'), ('Huambo'), ('Huíla'),
    ('Icolo e Bengo'), ('Luanda'), ('Lunda Norte'), ('Lunda Sul'), ('Malanje'),
    ('Moxico'), ('Moxico Leste'), ('Namibe'), ('Uíge'), ('Zaire')`);
  await syncAngolaLocations({ env: {} });
  console.log('Localidades fornecidas para Angola importadas.');
  console.log('Migration 001_create_admins aplicada (ou já existente).');
  console.log('Migration 003_customer_accounts_and_ads aplicada (ou já existente).');
}

migrate()
  .catch(error => {
    console.error('Não foi possível aplicar a migration:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());