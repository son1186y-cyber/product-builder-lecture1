let map;
let markers = [];
let categoryChart;

// Initialize Map
function initMap() {
    map = L.map('map').setView([37.5665, 126.9780], 13); // Default: Seoul
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

// Search Function
async function searchPlaces() {
    const query = document.getElementById('searchInput').value;
    if (!query) {
        alert('검색어를 입력하세요!');
        return;
    }

    const btn = document.getElementById('searchButton');
    btn.disabled = true;
    btn.innerText = '검색 중...';

    try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.error) {
            alert(data.error);
            return;
        }

        updateUI(data.items);
    } catch (error) {
        console.error('Search error:', error);
        alert('검색 중 오류가 발생했습니다.');
    } finally {
        btn.disabled = false;
        btn.innerText = '분석하기';
    }
}

// Update UI (Map, Chart, List, Strategy)
function updateUI(items) {
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    if (items.length === 0) {
        document.getElementById('resultList').innerHTML = '<p class="empty-msg">검색 결과가 없습니다.</p>';
        document.getElementById('strategyContent').innerHTML = '<p class="empty-msg">데이터가 없습니다.</p>';
        return;
    }

    const latlngs = [];
    const categories = {};
    const listHtml = [];
    
    // Marketing Stats
    let totalBooking = 0;
    let totalLink = 0;
    let totalEvent = 0;

    items.forEach(item => {
        if (item.lat && item.lng) {
            const marker = L.marker([item.lat, item.lng])
                .bindPopup(`<b>${item.title}</b><br>${item.category}<br>${item.address}`)
                .addTo(map);
            markers.push(marker);
            latlngs.push([item.lat, item.lng]);
        }

        const cat = item.category.split('>')[0].trim() || '기타';
        categories[cat] = (categories[cat] || 0) + 1;

        if (item.marketing.hasBooking) totalBooking++;
        if (item.marketing.hasLink) totalLink++;
        if (item.marketing.hasEvent) totalEvent++;

        listHtml.push(`
            <div class="result-item">
                <span class="category">${item.category}</span>
                <h3>${item.id}. ${item.title}</h3>
                <p>${item.roadAddress || item.address}</p>
                <div class="mkt-tags">
                    ${item.marketing.hasLink ? '<span class="tag link">링크 있음</span>' : '<span class="tag no-link">링크 없음</span>'}
                    ${item.marketing.hasBooking ? '<span class="tag booking">예약/문의</span>' : ''}
                    ${item.marketing.hasEvent ? '<span class="tag event">이벤트중</span>' : ''}
                </div>
            </div>
        `);
    });

    if (latlngs.length > 0) map.fitBounds(L.latLngBounds(latlngs));
    document.getElementById('resultList').innerHTML = listHtml.join('');
    
    updateChart(categories);
    generateStrategy(items.length, totalBooking, totalLink, totalEvent, categories);
}

function generateStrategy(total, booking, link, event, categories) {
    const bookingRate = (booking / total * 100).toFixed(1);
    const linkRate = (link / total * 100).toFixed(1);
    const eventRate = (event / total * 100).toFixed(1);

    let strategyHtml = `
        <div class="strategy-report">
            <div class="diag-section">
                <h3>📊 마케팅 현황 진단 (상위 100개 기준)</h3>
                <ul>
                    <li><b>스마트플레이스 최적화율</b>: 약 ${linkRate}%의 업체가 외부 링크(블로그/인스타)를 연결 중입니다.</li>
                    <li><b>예약 시스템 도입률</b>: ${bookingRate}% 업체가 네이버 예약 또는 전화 예약을 강조하고 있습니다.</li>
                    <li><b>프로모션 활성도</b>: 단 ${eventRate}%의 업체만이 본문 내 이벤트/할인을 명시하고 있습니다.</li>
                </ul>
            </div>
            
            <div class="action-section">
                <h3>💡 맞춤형 마케팅 설계</h3>
                <div class="strategy-card-mini">
                    <h4>1. 상위 노출을 위한 SEO 전략</h4>
                    <p>현재 검색 결과에서 설명문 길이가 짧은 업체가 많습니다. 상세 설명에 핵심 키워드(지역명+메뉴+분위기)를 500자 이상 확보하고, 키워드 밀도를 조절하여 검색 가시성을 높여야 합니다.</p>
                </div>
                <div class="strategy-card-mini">
                    <h4>2. 전환율 극대화 (예약 시스템)</h4>
                    <p>${bookingRate < 30 ? '예약 시스템 도입이 저조한 지역입니다. 지금 네이버 예약을 연동하고 "첫 방문 할인 쿠폰"을 제공하면 경쟁사보다 높은 전환율을 확보할 수 있습니다.' : '예약 경쟁이 치열합니다. 단순 예약보다는 "알림받기" 시 증정되는 혜택을 강조하여 단골 고객 데이터를 선점하세요.'}</p>
                </div>
                <div class="strategy-card-mini">
                    <h4>3. 바이럴 및 SNS 연동</h4>
                    <p>링크가 없는 ${100-linkRate}%의 업체와 차별화하기 위해 공식 블로그를 플레이스에 연동하세요. 특히 "리뷰이벤트" 문구를 설명문 앞단에 배치하여 방문자 리뷰 자생력을 키우는 것이 필수입니다.</p>
                </div>
            </div>
        </div>
    `;
    document.getElementById('strategyContent').innerHTML = strategyHtml;
}

// Update Chart.js
function updateChart(categories) {
    const labels = Object.keys(categories);
    const data = Object.values(categories);

    if (categoryChart) {
        categoryChart.destroy();
    }

    const ctx = document.getElementById('categoryChart').getContext('2d');
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: '상권 분포',
                data: data,
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#42a5f5', '#66bb6a'
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                }
            }
        }
    });
}

// Event Listeners
document.getElementById('searchButton').addEventListener('click', searchPlaces);
document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchPlaces();
});

// Init
window.onload = initMap;
