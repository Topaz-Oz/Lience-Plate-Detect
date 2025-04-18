const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db.config');
const userRoutes = require('./routes/userRoutes');
const app = express();

// Kết nối MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', userRoutes);

// Port
const PORT = process.env.PORT || 5000;

// Route cơ bản
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to User API' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});