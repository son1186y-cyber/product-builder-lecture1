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
    let { query } = req.query;
    if (!query) {
        return res.status(400).json({ error: '검색어를 입력해 주세요.' });
    }

    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: '네이버 API 키가 설정되지 않았습니다. .env 파일을 확인해 주세요.' });
    }

    try {
        console.log(`검색 시작: ${query}`); // 서버 로그 확인용

        const fetchBatch = async (start) => {
            return await axios.get('https://openapi.naver.com/v1/search/local.json', {
                params: {
                    query: query, // axios가 내부적으로 encodeURIComponent를 처리함
                    display: 50,
                    start: start,
                    sort: 'comment'
                },
                headers: {
                    'X-Naver-Client-Id': clientId,
                    'X-Naver-Client-Secret': clientSecret,
                    'Content-Type': 'application/json; charset=utf-8'
                }
            });
        };

        const [res1, res2] = await Promise.all([
            fetchBatch(1),
            fetchBatch(51)
        ]);

        const batch1 = res1.data.items || [];
        const batch2 = res2.data.items || [];
        const combined = [...batch1, ...batch2];

        if (combined.length === 0) {
            return res.json({ items: [], message: '검색 결과가 없습니다.' });
        }

        const allItems = combined.map((item, index) => {
            try {
                const [lng, lat] = proj4("TM128", wgs84, [parseInt(item.mapx), parseInt(item.mapy)]);
                
                // 마케팅 분석 로직 (description이 없을 경우 대비)
                const desc = item.description || "";
                const title = item.title || "";
                const hasLink = !!item.link;
                const hasBooking = desc.includes('예약') || title.includes('예약');
                const hasEvent = desc.includes('이벤트') || desc.includes('할인') || desc.includes('서비스');
                const descLength = desc.length;

                return {
                    id: index + 1,
                    title: title.replace(/<[^>]*>?/gm, ''),
                    category: item.category,
                    description: desc,
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
        const status = error.response ? error.response.status : 500;
        const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error(`API 오류 [${status}]:`, errorMsg);
        res.status(status).json({ error: '네이버 API 호출에 실패했습니다.', details: errorMsg });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
