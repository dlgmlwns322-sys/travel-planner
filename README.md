# 여행플래너 (오사카 공유 여행 플래너)

일행과 함께 쓰는 여행 플래너입니다. 갈 곳 리스트, 일차별 동선(대중교통 시간), 가계부를 실시간으로 공유합니다.

- 배포: GitHub Pages (`index.html`, `app.js`, `styles.css`)
- 데이터: Supabase (Realtime, 익명 로그인 + 여행별 초대 PIN)
- 지도: Google Maps JavaScript API / Places
- `config.local.js`, `supabase.local.js`는 브라우저용 공개 키만 담습니다. Google Maps 키는 허용 사이트(리퍼러)로 제한해서 씁니다.
