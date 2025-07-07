const express = require('express');
const cors = require('cors');
const circularityRoutes = require('./routes/circularity');

const app = express();

app.use(cors({
    origin: 'http://localhost:3000'
}));
app.use(express.json());

app.use('/api/circularity', circularityRoutes);

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    console.log(`♻️  Circularity service running on port ${PORT}`);
});
