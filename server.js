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
        return res.status(500).json({ error: 'Naver API keys not configured.' });
    }

    try {
        // Fetch up to 100 results (2 calls of 50 each)
        const fetchBatch = async (start) => {
            const response = await axios.get('https://openapi.naver.com/v1/search/local.json', {
                params: {
                    query: query,
                    display: 50,
                    start: start,
                    sort: 'comment'
                },
                headers: {
                    'X-Naver-Client-Id': clientId,
                    'X-Naver-Client-Secret': clientSecret
                }
            });
            return response.data.items;
        };

        const [batch1, batch2] = await Promise.all([
            fetchBatch(1),
            fetchBatch(51)
        ]);

        const allItems = [...batch1, ...batch2].map((item, index) => {
            try {
                const [lng, lat] = proj4("TM128", wgs84, [parseInt(item.mapx), parseInt(item.mapy)]);
                
                // Heuristic Marketing Analysis
                const hasLink = !!item.link;
                const hasBooking = item.description.includes('예약') || item.title.includes('예약');
                const hasEvent = item.description.includes('이벤트') || item.description.includes('할인') || item.description.includes('서비스');
                const descLength = item.description.length;

                return {
                    id: index + 1,
                    title: item.title.replace(/<[^>]*>?/gm, ''),
                    category: item.category,
                    description: item.description,
                    address: item.address,
                    roadAddress: item.roadAddress,
                    lat,
                    lng,
                    link: item.link,
                    marketing: {
                        hasLink,
                        hasBooking,
                        hasEvent,
                        descLength
                    }
                };
            } catch (err) {
                return null;
            }
        }).filter(item => item !== null);

        res.json({ items: allItems });
    } catch (error) {
        console.error('API Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
