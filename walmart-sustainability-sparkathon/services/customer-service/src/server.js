const express = require('express');
const cors = require('cors'); // <-- Import the cors library
const customerRoutes = require('./routes/customer');

const app = express();

// --- CRITICAL FIX ---
// Use the cors middleware to allow requests from your frontend
app.use(cors({
    origin: 'http://localhost:3000' 
}));
// --------------------

app.use(express.json());

// API Routes
app.use('/api/customer', customerRoutes);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`🔵 Customer service running on port ${PORT}`);
});