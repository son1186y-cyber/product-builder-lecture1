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

// Update UI (Map, Chart, List)
function updateUI(items) {
    // 1. Clear existing markers
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    if (items.length === 0) {
        document.getElementById('resultList').innerHTML = '<p class="empty-msg">검색 결과가 없습니다.</p>';
        return;
    }

    // 2. Add Markers & Fit Map
    const latlngs = [];
    const categories = {};
    const listHtml = [];

    items.forEach(item => {
        if (item.lat && item.lng) {
            const marker = L.marker([item.lat, item.lng])
                .bindPopup(`<b>${item.title}</b><br>${item.category}<br>${item.address}`)
                .addTo(map);
            markers.push(marker);
            latlngs.push([item.lat, item.lng]);
        }

        // Aggregate Categories
        const cat = item.category.split('>')[0].trim() || '기타';
        categories[cat] = (categories[cat] || 0) + 1;

        // List Item
        listHtml.push(`
            <div class="result-item">
                <span class="category">${item.category}</span>
                <h3>${item.title}</h3>
                <p>${item.roadAddress || item.address}</p>
            </div>
        `);
    });

    if (latlngs.length > 0) {
        map.fitBounds(L.latLngBounds(latlngs));
    }

    // 3. Update List
    document.getElementById('resultList').innerHTML = listHtml.join('');

    // 4. Update Chart
    updateChart(categories);
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
