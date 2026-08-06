const express = require('express');
const path = require('path');
const convertRoute = require('./routes/convert');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/convert', convertRoute);

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
