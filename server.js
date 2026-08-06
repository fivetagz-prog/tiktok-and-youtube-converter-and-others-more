const express = require('express');
const path = require('path');
const convertRoute = require('./routes/convert');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mount converter route
app.use('/api/convert', convertRoute);

app.listen(PORT, () => {
    console.log(`Media Converter active at http://localhost:${PORT}`);
});
