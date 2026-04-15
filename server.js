require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const proj4 = require('proj4');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API 라우트를 static 설정보다 위에 배치 (경로 우선순위 확보)
app.get('/api/search', async (req, res) => {
    let { query } = req.query;
    if (!query) {
        return res.status(400).json({ error: '검색어를 입력해 주세요.' });
    }

    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: '네이버 API 키가 설정되지 않았습니다.', details: '.env 파일을 확인하세요.' });
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
        console.error('API Error:', error.message);
        res.status(500).json({ error: '네이버 API 호출 실패', details: error.message });
    }
});

// 정적 파일 서빙은 API 라우트 아래에 배치
app.use(express.static('.'));

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
