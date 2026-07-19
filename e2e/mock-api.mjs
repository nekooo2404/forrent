import http from 'node:http';

const port = Math.max(1, Number(process.env.MOCK_API_PORT) || 4100);
const roomDetailDelayMs = Math.max(0, Number(process.env.ROOM_DETAIL_DELAY_MS) || 0);

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
  media_type: 'IMAGE',
  label: ['OVERVIEW', 'SLEEPING_AREA', 'BATHROOM'][index],
  sort_order: index,
  created_at: '2026-07-01T08:00:00Z',
}));
const cloudinaryRoomImages = Array.from({ length: 3 }, (_, index) => ({
  id: index + 101,
  image: null,
  image_url: index === 2
    ? 'https://res.cloudinary.com/forrent-test/video/upload/v1/e2e-room-tour.mp4'
    : `https://res.cloudinary.com/forrent-test/image/upload/v1/e2e-room-${index + 1}.jpg`,
  media_type: index === 2 ? 'VIDEO' : 'IMAGE',
  label: ['OVERVIEW', 'KITCHEN', 'VIDEO_TOUR'][index],
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
  water_billing_type: 'PER_PERSON',
  water_price_per_person: '100000',
  water_price_per_cubic_meter: '0',
  service_fee: '300000',
  actual_area: '25.00',
  area_range: areaRange,
  amenities,
  short_description: 'Phong sang, noi that co ban, gia va phi ro rang.',
  thumbnail: null,
  thumbnail_url: null,
  status: 'PUBLISHED',
  hero_eligible: false,
  created_at: '2026-07-01T08:00:00Z',
  updated_at: '2026-07-10T08:00:00Z',
};
const heroRoomWithImage = {
  ...room,
  id: 2,
  title: 'Studio gan Sakura',
  slug: 'e2e-room-hero',
  hero_eligible: true,
  thumbnail_url: imageDataUrl('#3f7664'),
};
const requestCounts = new Map();

function envelope(data, message = 'OK') {
  return { success: true, message, data };
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  let decodedPathname = url.pathname;
  try {
    decodedPathname = decodeURIComponent(url.pathname);
  } catch {
    // Keep the encoded path so malformed input falls through to the 404 response.
  }

  if (url.pathname === '/__test__/request-counts/') {
    if (request.method === 'DELETE') {
      requestCounts.clear();
      sendJson(response, 200, envelope({}));
      return;
    }
    sendJson(response, 200, envelope(Object.fromEntries(requestCounts)));
    return;
  }

  const requestCountKey = `${request.method} ${decodedPathname}`;
  requestCounts.set(requestCountKey, (requestCounts.get(requestCountKey) ?? 0) + 1);

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
      room_subtypes: [{ id: 1, parent_type: 'CCDV', name: 'Studio', is_active: true }],
      statuses: [{ value: 'PUBLISHED', label: 'Dang hien thi' }],
    }));
    return;
  }
  const cloudinaryRoomMatch = decodedPathname.match(/^\/api\/rooms\/(e2e-room-cloudinary)\/$/);
  const roomDetailMatch = cloudinaryRoomMatch ?? decodedPathname.match(
    /^\/api\/rooms\/(e2e-room(?:-(?:one|many|water-meter|operational-title|performance)|-\d+)?|phòng-đẹp-hà-nội)\/$/,
  );
  if (roomDetailMatch) {
    const slug = roomDetailMatch[1];
    const images = slug.endsWith('-cloudinary')
      ? cloudinaryRoomImages
      : slug.endsWith('-one')
        ? roomImages.slice(0, 1)
        : slug.endsWith('-many')
          ? roomImages
          : [];
    const body = envelope({
      ...room,
      slug,
      title: slug === 'phòng-đẹp-hà-nội' ? '🎉 PHÒNG ĐẸP HÀ NỘI 🎉' : room.title,
      ...(slug.endsWith('-operational-title') ? { title: 'P801 - KHAI TRƯƠNG SIÊU PHẨM CCMN MỚI TINH 🎉' } : {}),
      city: slug === 'phòng-đẹp-hà-nội' ? { ...city, name: 'Hà Nội' } : city,
      ...(slug.endsWith('-water-meter')
        ? { water_billing_type: 'PER_CUBIC_METER', water_price_per_cubic_meter: '25000' }
        : {}),
      description: 'Can ho dich vu day du thong tin de dat lich xem.',
      images,
    });
    if (slug.endsWith('-performance') && roomDetailDelayMs > 0) {
      setTimeout(() => sendJson(response, 200, body), roomDetailDelayMs);
      return;
    }
    sendJson(response, 200, body);
    return;
  }
  if (url.pathname === '/api/rooms/') {
    const search = url.searchParams.get('search');
    if (url.searchParams.get('hero_eligible') === 'true') {
      sendJson(response, 200, envelope({ count: 1, next: null, previous: null, results: [heroRoomWithImage] }));
      return;
    }
    if (!search && url.searchParams.get('status') === 'PUBLISHED') {
      sendJson(response, 200, envelope({
        count: 2,
        next: null,
        previous: null,
        results: [room, heroRoomWithImage],
      }));
      return;
    }
    if (search === 'visual-empty') {
      sendJson(response, 200, envelope({ count: 0, next: null, previous: null, results: [] }));
      return;
    }
    if (search === 'visual-12' || search === 'pagination-125' || search === 'pagination-images') {
      const roomCount = search === 'pagination-125' ? 125 : 12;
      const rooms = Array.from({ length: roomCount }, (_, index) => ({
        ...room,
        id: index + 1,
        slug: `e2e-room-${index + 1}`,
        title: `Can ho dich vu ${index + 1}`,
        ...(search === 'pagination-images'
          ? { thumbnail_url: `https://res.cloudinary.com/forrent-test/image/upload/v1/pagination-${index + 1}.jpg` }
          : {}),
      }));
      const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
      const pageSize = Math.max(1, Number(url.searchParams.get('page_size')) || 6);
      const offset = (page - 1) * pageSize;
      sendJson(response, 200, envelope({
        count: rooms.length,
        next: offset + pageSize < rooms.length ? `?page=${page + 1}` : null,
        previous: page > 1 ? `?page=${page - 1}` : null,
        results: rooms.slice(offset, offset + pageSize),
      }));
      return;
    }
    sendJson(response, 200, envelope({ count: 1, next: null, previous: null, results: [room] }));
    return;
  }
  if (url.pathname === '/api/blogs/') {
    if (url.searchParams.get('page') === '4') {
      const posts = Array.from({ length: 7 }, (_, index) => ({
        id: index + 22,
        slug: `cam-nang-${index + 22}`,
        title: `Cam nang thue phong ${index + 22}`,
        short_description: 'Kinh nghiem thue phong thuc te.',
        content: 'Noi dung cam nang thue phong.',
        author_name: 'ForRent',
        thumbnail: null,
        published_at: '2026-07-10T08:00:00Z',
        created_at: '2026-07-10T08:00:00Z',
      }));
      sendJson(response, 200, envelope({ count: 28, next: null, previous: '?page=3', results: posts }));
      return;
    }
    sendJson(response, 200, envelope({ count: 0, next: null, previous: null, results: [] }));
    return;
  }
  if (url.pathname === '/api/contact/' && request.method === 'POST') {
    sendJson(response, 201, envelope({ id: 1 }));
    return;
  }

  sendJson(response, 404, { success: false, message: 'Not found', errors: {} });
});

server.listen(port, '127.0.0.1');
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
