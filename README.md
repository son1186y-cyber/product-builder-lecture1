# Naver Place Commercial Area Analysis (네이버 플레이스 상권 분석 도구)

네이버 검색 API를 활용하여 특정 상권의 업종 분포와 위치를 분석하는 도구입니다.

## 주요 기능
- **상권 검색**: 특정 지역이나 키워드(예: 강남역, 홍대 카페)로 검색.
- **업종 비율 분석**: 검색된 업체들의 카테고리를 분석하여 도넛 차트로 시각화.
- **지도 시각화**: 검색된 업체들의 위치를 지도상에 마커로 표시.
- **결과 리스트**: 검색된 업체들의 상세 정보(이름, 주소, 카테고리) 제공.

## 설치 및 실행 방법

1. **의존성 설치**
   ```bash
   npm install
   ```

2. **API 키 설정**
   - `.env.template` 파일을 복사하여 `.env` 파일을 생성합니다.
   - [네이버 클라우드 플랫폼](https://www.ncloud.com/)에서 'Search API (Local)' 서비스를 신청하고 Client ID와 Client Secret을 발급받습니다.
   - `.env` 파일에 발급받은 키를 입력합니다.
     ```
     NAVER_CLIENT_ID=여러분의_ID
     NAVER_CLIENT_SECRET=여러분의_Secret
     ```

3. **서버 실행**
   ```bash
   node server.js
   ```

4. **접속**
   브라우저에서 `http://localhost:3000`에 접속합니다.

## 기술 스택
- **Backend**: Node.js, Express, Axios
- **Frontend**: Vanilla JS, Leaflet (Map), Chart.js (Visualization)
- **Coordinate Conversion**: Proj4.js (KATECH to WGS84)
