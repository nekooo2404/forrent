import type { Page } from '@playwright/test';

const landlordRoom = {
  id: 42,
  room_code: 'FR-A1B2C3D4E5F6',
  can_delete: true,
  title: 'Studio gần ga metro',
  public_title: 'Studio gần ga metro',
  slug: 'studio-gan-ga-metro',
  room_type: 'CCMN',
  room_subtype: null,
  room_subtype_name: '',
  city: { id: 1, name: 'Hà Nội', slug: 'ha-noi', is_active: true },
  ward: { id: 1, city: 1, city_name: 'Hà Nội', name: 'Nam Từ Liêm', slug: 'nam-tu-liem', is_active: true },
  address: 'Khu Sakura, Vinhomes Smart City',
  price: '4200000',
  deposit_type: 1,
  deposit_type_name: 'Cọc 1 tháng',
  deposit_amount: '4200000',
  electricity_price_per_kwh: '4000',
  water_billing_type: 'PER_PERSON',
  water_price_per_person: '100000',
  water_price_per_cubic_meter: '0',
  service_fee: '200000',
  actual_area: '25.00',
  area_range: { id: 1, name: '20-30 m2', min_area: '20.00', max_area: '30.00', is_active: true },
  amenities: [],
  short_description: 'Phòng sáng và đủ nội thất cơ bản.',
  description: 'Phòng phù hợp người đi làm.',
  thumbnail: null,
  images: [],
  status: 'DRAFT',
  created_at: '2026-07-20T08:00:00Z',
  updated_at: '2026-07-20T08:00:00Z',
};

export async function mockLandlordWorkspace(
  page: Page,
  role: 'LANDLORD' | 'INDEPENDENT_SALER' = 'LANDLORD',
) {
  await page.route('**/api/auth/session', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, message: 'OK', data: { authenticated: true, role } }),
  }));
  await page.route('**/api/auth/me', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, message: 'OK', data: { id: 71, full_name: 'Chủ nhà E2E', email: 'owner-e2e@forrent.io.vn', phone: '0914032771', role } }),
  }));
  await page.route('**/api/rooms/filters**', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, message: 'OK', data: {
      cities: [{ id: 1, name: 'Hà Nội', slug: 'ha-noi', is_active: true }],
      wards: [{ id: 1, city: 1, city_name: 'Hà Nội', name: 'Nam Từ Liêm', slug: 'nam-tu-liem', is_active: true }],
      amenities: [{ id: 1, name: 'Ban công', slug: 'ban-cong', is_active: true }],
      area_ranges: [{ id: 1, name: '20-30 m2', min_area: '20.00', max_area: '30.00', is_active: true }],
      deposit_types: [{ id: 1, name: 'Cọc 1 tháng', description: '', is_active: true }],
      room_types: [{ value: 'CCMN', label: 'Chung cư mini' }, { value: 'CHDV', label: 'Căn hộ dịch vụ' }],
      room_subtypes: [],
    } }),
  }));
  await page.route('**/api/landlord/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname.replace(/\/$/, '');
    const response = (data: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, message: 'OK', data }) });
    if (pathname.endsWith('/rooms/dashboard')) return response({
      room_summary: { total: 1, draft: 1, pending_review: 0, published: 0, rented: 0, hidden: 0, archived: 0 },
      new_request_count: 0,
      today_appointment_count: 0,
      incomplete_room_count: 1,
      new_requests: [],
      today_appointments: [],
      incomplete_rooms: [landlordRoom],
      commission: role === 'INDEPENDENT_SALER' ? { pending: 0, pending_amount: '0' } : null,
    });
    if (pathname.endsWith('/rooms/summary')) return response({ total: 1, draft: 1, pending_review: 0, published: 0, rented: 0, hidden: 0, archived: 0 });
    if (pathname.endsWith('/rooms')) return response({ count: 1, next: null, previous: null, results: [landlordRoom] });
    if (pathname.endsWith('/viewing-requests')) return response({ count: 0, next: null, previous: null, results: [] });
    if (pathname.endsWith('/commissions/summary')) return response({ total: 0, pending: 0, approved: 0, paid: 0, cancelled: 0, total_amount: '0', pending_amount: '0', approved_amount: '0', paid_amount: '0' });
    if (pathname.endsWith('/commissions')) return response({ count: 0, next: null, previous: null, results: [] });
    if (pathname.endsWith('/notifications')) return response({ unread_count: 1, results: [{ id: 901, type: 'NEW_VIEWING_REQUEST', viewing_request: 501, room_id: 42, room_title: landlordRoom.title, room_code: landlordRoom.room_code, requester_name: 'Nguyễn Minh Anh', preferred_viewing_date: '2026-07-28', preferred_viewing_time_slot: 'morning', is_read: false, read_at: null, created_at: '2026-07-23T08:30:00Z' }] });
    return response(landlordRoom);
  });
}
