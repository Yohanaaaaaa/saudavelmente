const app = require('./src/app');

const PORT = process.env.PORT || 3007;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SaudavelMente API rodando na porta ${PORT}`);
});