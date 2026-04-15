require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const proj4 = require('proj4');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Proj4 definitions
// Naver Search API coordinates are in KATECH (TM128) - Bessel based
proj4.defs("TM128", "+proj=tmerc +lat_0=38 +lon_0=128 +k=1 +x_0=400000 +y_0=600000 +ellps=bessel +units=m +no_defs +towgs84=-146.43,507.89,681.46");
// WGS84 for Leaflet
const wgs84 = "EPSG:4326";

// 모든 API 요청에 대해 JSON 응답을 보장하도록 설정
app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});

app.get('/api/search', async (req, res) => {
    let { query } = req.query;
    console.log(`[서버] 검색 요청 수신: ${query}`);

    if (!query) {
        return res.status(400).json({ error: '검색어를 입력해 주세요.' });
    }

    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'API 키 설정 오류', details: '.env 파일을 확인하세요.' });
    }

    try {
        const fetchBatch = async (start) => {
            return await axios.get('https://openapi.naver.com/v1/search/local.json', {
                params: { query, display: 50, start, sort: 'comment' },
                headers: {
                    'X-Naver-Client-Id': clientId,
                    'X-Naver-Client-Secret': clientSecret
                }
            });
        };

        const [res1, res2] = await Promise.all([fetchBatch(1), fetchBatch(51)]);
        const combined = [...(res1.data.items || []), ...(res2.data.items || [])];

        const allItems = combined.map((item, index) => {
            try {
                const [lng, lat] = proj4("TM128", wgs84, [parseInt(item.mapx), parseInt(item.mapy)]);
                return {
                    id: index + 1,
                    title: item.title.replace(/<[^>]*>?/gm, ''),
                    category: item.category,
                    description: item.description || "",
                    address: item.address,
                    roadAddress: item.roadAddress,
                    lat, lng,
                    link: item.link,
                    marketing: {
                        hasLink: !!item.link,
                        hasBooking: (item.description || "").includes('예약') || item.title.includes('예약'),
                        hasEvent: (item.description || "").includes('이벤트') || (item.description || "").includes('할인'),
                        descLength: (item.description || "").length
                    }
                };
            } catch (err) { return null; }
        }).filter(item => item !== null);

        res.json({ items: allItems });
    } catch (error) {
        // 상세 에러 로그 출력
        if (error.response) {
            console.error('--- 네이버 API 에러 상세 ---');
            console.error('상태 코드:', error.response.status);
            console.error('에러 내용:', JSON.stringify(error.response.data));
            console.error('---------------------------');
            res.status(error.response.status).json({ 
                error: '네이버 API 에러', 
                details: error.response.data.errorMessage || error.response.data.message 
            });
        } else {
            console.error('서버 내부 에러:', error.message);
            res.status(500).json({ error: '서버 내부 오류', details: error.message });
        }
    }
});

// 정적 파일은 /api 외의 경로에서만 서빙
app.use(express.static('.'));

// 그 외 모든 요청에 대해 404 처리 (HTML 대신 JSON 반환)
app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        res.status(404).json({ error: '잘못된 API 경로입니다.' });
    } else {
        res.status(404).send('Not Found');
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
