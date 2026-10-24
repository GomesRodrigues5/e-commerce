require('dotenv').config();
const app = require('./src/app');
const { syncAngolaLocations } = require('./src/services/angolaLocations');
const repository = require('./src/repositories/commerceRepository');

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`ApexFit API listening on http://localhost:${port}`);
  const syncLocations = () => syncAngolaLocations()
    .then(updated => { if (updated) console.log('Localidades de Angola atualizadas.'); })
    .catch(error => console.error('Não foi possível atualizar as localidades de Angola:', error.message));
  syncLocations();
  if (process.env.ANGOLA_LOCATIONS_URL) {
    const timer = setInterval(syncLocations, 24 * 60 * 60 * 1000);
    timer.unref();
  }
  const releaseReservations = () => repository.releaseExpiredReservations()
    .catch(error => console.error('Não foi possível expirar reservas:', error.message));
  releaseReservations();
  const reservationTimer = setInterval(releaseReservations, 60 * 1000);
  reservationTimer.unref();
});
