import http from 'node:http';

const city = { id: 1, name: 'Ha Noi', slug: 'ha-noi', is_active: true };
const ward = { id: 1, city: 1, city_name: 'Ha Noi', name: 'Nam Tu Liem', slug: 'nam-tu-liem', is_active: true };
const amenities = [
  { id: 1, name: 'Dieu hoa', icon: 'wind', is_active: true },
  { id: 2, name: 'May giat', icon: 'washing-machine', is_active: true },
];
const areaRange = { id: 1, name: '20-30 m2', min_area: '20.00', max_area: '30.00', is_active: true };
const imageDataUrl = (color) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="${color}"/><rect x="180" y="160" width="840" height="480" rx="24" fill="#fff7ed" opacity=".82"/></svg>`)}`;
const roomImages = ['#9a5b31', '#3f7664', '#b78348'].map((color, index) => ({
  id: index + 1,
  image: null,
  image_url: imageDataUrl(color),
  sort_order: index,
  created_at: '2026-07-01T08:00:00Z',
}));
const room = {
  id: 1,
  title: 'Can ho dich vu Nam Tu Liem',
  slug: 'e2e-room',
  room_type: 'CCDV',
  city,
  ward,
  address: '70 Xuan Phuong',
  price: '3700000',
  deposit_type: 1,
  deposit_type_name: 'Coc 1 thang',
  deposit_amount: '3700000',
  electricity_price_per_kwh: '4000',
  water_price_per_person: '100000',
  service_fee: '300000',
  actual_area: '25.00',
  area_range: areaRange,
  amenities,
  short_description: 'Phong sang, noi that co ban, gia va phi ro rang.',
  thumbnail: null,
  thumbnail_url: null,
  status: 'PUBLISHED',
  created_at: '2026-07-01T08:00:00Z',
  updated_at: '2026-07-10T08:00:00Z',
};

function envelope(data, message = 'OK') {
  return { success: true, message, data };
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');

  if (request.method === 'OPTIONS') {
    response.writeHead(204).end();
    return;
  }
  if (url.pathname === '/api/health/') {
    sendJson(response, 200, { status: 'ok' });
    return;
  }
  if (url.pathname === '/api/rooms/filters/') {
    sendJson(response, 200, envelope({
      cities: [city],
      wards: [ward],
      amenities,
      area_ranges: [areaRange],
      deposit_types: [{ id: 1, name: 'Coc 1 thang', is_active: true }],
      room_types: [{ value: 'CCDV', label: 'Can ho dich vu' }],
      statuses: [{ value: 'PUBLISHED', label: 'Dang hien thi' }],
    }));
    return;
  }
  const roomDetailMatch = url.pathname.match(/^\/api\/rooms\/(e2e-room(?:-(?:one|many))?)\/$/);
  if (roomDetailMatch) {
    const slug = roomDetailMatch[1];
    const images = slug.endsWith('-one') ? roomImages.slice(0, 1) : slug.endsWith('-many') ? roomImages : [];
    sendJson(response, 200, envelope({ ...room, slug, description: 'Can ho dich vu day du thong tin de dat lich xem.', images }));
    return;
  }
  if (url.pathname === '/api/rooms/') {
    const search = url.searchParams.get('search');
    if (search === 'visual-empty') {
      sendJson(response, 200, envelope({ count: 0, next: null, previous: null, results: [] }));
      return;
    }
    if (search === 'visual-12') {
      const rooms = Array.from({ length: 12 }, (_, index) => ({
        ...room,
        id: index + 1,
        slug: `e2e-room-${index + 1}`,
        title: `Can ho dich vu ${index + 1}`,
      }));
      sendJson(response, 200, envelope({ count: rooms.length, next: null, previous: null, results: rooms }));
      return;
    }
    sendJson(response, 200, envelope({ count: 1, next: null, previous: null, results: [room] }));
    return;
  }
  if (url.pathname === '/api/blogs/') {
    sendJson(response, 200, envelope({ count: 0, next: null, previous: null, results: [] }));
    return;
  }
  if (url.pathname === '/api/contact/' && request.method === 'POST') {
    sendJson(response, 201, envelope({ id: 1 }));
    return;
  }

  sendJson(response, 404, { success: false, message: 'Not found', errors: {} });
});

server.listen(4100, '127.0.0.1');
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
