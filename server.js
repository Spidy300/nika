const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use(cors());

// Proxy for AniList
app.use('/anilist', createProxyMiddleware({
    target: 'https://graphql.anilist.co',
    changeOrigin: true,
    pathRewrite: {
        '^/anilist': ''
    }
}));

// Proxy for Consumet
app.use('/consumet', createProxyMiddleware({
    target: 'https://api.consumet.org',
    changeOrigin: true,
    pathRewrite: {
        '^/consumet': ''
    }
}));

app.listen(3000, () => {
    console.log('Proxy server running on port 3000');
});