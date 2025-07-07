const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const inventoryRoutes = require('./routes/inventory');
const { updateInventoryStatus } = require('./controllers/inventoryController');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/inventory', inventoryRoutes);

// Real-time communication with the frontend
io.on('connection', (socket) => {
  console.log('A user connected to the GreenShelf service');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

// Scheduled tasks to simulate real-time updates
setInterval(() => {
  updateInventoryStatus(io);
}, 15000); // Run every 15 seconds for demo purposes

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🟢 GreenShelf service running on port ${PORT}`);
}); 