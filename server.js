require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const proj4 = require('proj4');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Proj4 definitions
// Naver Search API coordinates are in KATECH (TM128) - Bessel based
proj4.defs("TM128", "+proj=tmerc +lat_0=38 +lon_0=128 +k=1 +x_0=400000 +y_0=600000 +ellps=bessel +units=m +no_defs +towgs84=-146.43,507.89,681.46");
// WGS84 for Leaflet
const wgs84 = "EPSG:4326";

app.get('/api/search', async (req, res) => {
    const { query } = req.query;
    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'Naver API keys not configured. Please check your .env file.' });
    }

    try {
        const response = await axios.get('https://openapi.naver.com/v1/search/local.json', {
            params: {
                query: query,
                display: 50, // Max results
                start: 1,
                sort: 'comment' // Sort by review/comment count if possible
            },
            headers: {
                'X-Naver-Client-Id': clientId,
                'X-Naver-Client-Secret': clientSecret
            }
        });

        const items = response.data.items.map(item => {
            // Convert KATECH to WGS84
            // Search API returns mapx, mapy as integers.
            // These are usually in KATECH (TM128)
            try {
                const [lng, lat] = proj4("TM128", wgs84, [parseInt(item.mapx), parseInt(item.mapy)]);
                return {
                    title: item.title.replace(/<[^>]*>?/gm, ''), // Remove HTML tags
                    category: item.category,
                    description: item.description,
                    address: item.address,
                    roadAddress: item.roadAddress,
                    lat,
                    lng,
                    link: item.link
                };
            } catch (err) {
                console.error('Coordinate conversion error:', err);
                return { ...item, lat: 0, lng: 0 };
            }
        });

        res.json({ items });
    } catch (error) {
        console.error('API Error:', error.response ? error.response.data : error.message);
        res.status(error.response ? error.response.status : 500).json({ error: 'Failed to fetch data from Naver API' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
