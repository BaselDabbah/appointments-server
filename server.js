const express = require('express');
const config = require('config');
const bodyParser = require('body-parser');
const app = express();
require('dotenv').config();
const db = require('./firebase'); // Ensure Firestore is initialized

const cors = require('cors');

// CORS configuration (uncomment and adjust if needed)
// const corsOptions = {
//     origin: 'http://localhost:3000', 
//     credentials: true,            // access-control-allow-credentials:true
//     optionSuccessStatus: 200
// };
app.use(cors());
app.use(bodyParser.json());

app.use(express.json({ extended: false }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/business-owner', require('./routes/businessOwner'));

// Use Heroku's dynamically assigned port or default to 5000 locally
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));