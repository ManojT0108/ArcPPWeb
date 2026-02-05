require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const connectToMongo = require('./mongo/connect');

// Route modules
const healthRoutes = require('./routes/health');
const proteinRoutes = require('./routes/proteins');
const speciesRoutes = require('./routes/species');
const datasetRoutes = require('./routes/datasets');
const proteinsSummaryRoutes = require('./routes/proteinsSummary');
const plotRoutes = require('./routes/plot');

connectToMongo();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(compression());
app.set('etag', 'strong');
app.use(cors());
app.use(express.json());

// Mount routers
app.use('/api', healthRoutes);
app.use('/api', proteinRoutes);
app.use('/api', speciesRoutes);
app.use('/api', datasetRoutes);
app.use('/api', proteinsSummaryRoutes);
app.use('/api', plotRoutes);

const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

server.timeout = 120000;
