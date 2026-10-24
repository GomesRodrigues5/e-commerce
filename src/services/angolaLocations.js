const pool = require('../db/pool');
const localLocations = require('../../db/seeds/angola-locations.json');

const officialProvinceNames = new Set([
  'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando', 'Cubango', 'Cuanza Norte',
  'Cuanza Sul', 'Cunene', 'Huambo', 'Huíla', 'Icolo e Bengo', 'Luanda',
  'Lunda Norte', 'Lunda Sul', 'Malanje', 'Moxico', 'Moxico Leste', 'Namibe', 'Uíge', 'Zaire'
]);

async function syncAngolaLocations({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const sourceUrl = env.ANGOLA_LOCATIONS_URL;
  let payload = localLocations;
  if (sourceUrl) {
    const response = await fetchImpl(sourceUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`Fonte de localidades respondeu com HTTP ${response.status}`);
    payload = await response.json();
  }
  const provinces = payload?.provinces;
  if (!Array.isArray(provinces) || provinces.length !== officialProvinceNames.size) {
    throw new Error('A fonte de localidades deve conter as 21 províncias da divisão administrativa atual');
  }
  const seenProvinces = new Set();
  const normalized = provinces.map(province => {
    const name = String(province?.name || '').trim();
    const municipalities = Array.isArray(province?.municipalities)
      ? [...new Set(province.municipalities.map(value => String(value).trim()).filter(Boolean))]
      : [];
    if (!officialProvinceNames.has(name) || seenProvinces.has(name) || !municipalities.length ||
        municipalities.some(municipality => municipality.length > 120)) {
      throw new Error(`Dados de província ou municípios inválidos: ${name || '(sem nome)'}`);
    }
    seenProvinces.add(name);
    return { name, municipalities };
  });
  if (seenProvinces.size !== officialProvinceNames.size ||
      [...officialProvinceNames].some(name => !seenProvinces.has(name))) {
    throw new Error('A fonte não inclui todas as 21 províncias atuais');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM angola_municipalities');
    for (const province of normalized) {
      await connection.execute(
        'INSERT INTO angola_provinces (name) VALUES (?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
        [province.name]
      );
      const [rows] = await connection.execute('SELECT id FROM angola_provinces WHERE name = ?', [province.name]);
      for (const municipality of province.municipalities) {
        await connection.execute(
          'INSERT INTO angola_municipalities (province_id, name) VALUES (?, ?)',
          [rows[0].id, municipality]
        );
      }
    }
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { syncAngolaLocations, officialProvinceNames };
