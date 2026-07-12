import type { Page } from '@playwright/test';

function adminList(results: unknown[]) {
  return { success: true, message: 'OK', data: { count: results.length, next: null, previous: null, results } };
}

async function mockAdminSession(page: Page) {
  await page.route('**/api/auth/refresh', (route) => route.fulfill({ json: { success: true, message: 'OK', data: {} } }));
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      json: {
        success: true,
        message: 'OK',
        data: {
          id: 1,
          full_name: 'ForRent Admin',
          date_of_birth: null,
          email: 'admin@forrent.io.vn',
          phone: '0900000000',
          role: 'SALER',
          avatar: null,
        },
      },
    }),
  );
}

export async function mockAdminDashboard(page: Page) {
  await mockAdminSession(page);
  await page.route('**/api/admin/dashboard/summary', (route) =>
    route.fulfill({
      json: {
        success: true,
        message: 'OK',
        data: {
          total_rooms: 24,
          active_rooms: 18,
          total_viewing_requests: 42,
          total_new_leads: 7,
          total_moved_in_leads: 11,
          total_estimated_commission: 128000000,
          total_received_commission: 72000000,
          status_counts: { NEW: 7, CONTACTED: 9, SCHEDULED: 12, VIEWED: 4, CONVERTED: 10 },
          latest_leads: [
            {
              id: 101,
              full_name: 'Nguyen Van A',
              phone: '0912345678',
              room_id: 1,
              room_title: 'Can ho dich vu Nam Tu Liem',
              status: 'SCHEDULED',
              created_at: '2026-07-10T08:00:00Z',
            },
            {
              id: 102,
              full_name: 'Tran Thi B',
              phone: '0987654321',
              room_id: 2,
              room_title: 'Chung cu mini Cau Giay',
              status: 'NEW',
              created_at: '2026-07-10T07:00:00Z',
            },
          ],
        },
      },
    }),
  );
  await page.route('**/api/admin/commissions/summary', (route) =>
    route.fulfill({
      json: {
        success: true,
        message: 'OK',
        data: {
          total_received_commission: 72000000,
          total_estimated_commission: 128000000,
          total_pending_payout: 22000000,
          total_approved_payout: 16000000,
          total_paid_payout: 34000000,
          total_moved_in_leads: 11,
          total_pending_leads: 28,
          by_room: [
            {
              room_id: 1,
              room__title: 'Can ho dich vu Nam Tu Liem',
              total_estimated_commission: 48000000,
              total_received_commission: 26000000,
              lead_count: 14,
              moved_in_count: 5,
            },
            {
              room_id: 2,
              room__title: 'Chung cu mini Cau Giay',
              total_estimated_commission: 32000000,
              total_received_commission: 18000000,
              lead_count: 9,
              moved_in_count: 3,
            },
          ],
          by_month: [],
        },
      },
    }),
  );
}

export async function mockAdminRoomInventory(page: Page) {
  await mockAdminSession(page);
  await page.route('**/api/admin/rooms**', (route) => route.fulfill({ json: adminList([]) }));
  await page.route('**/api/admin/cities**', (route) =>
    route.fulfill({ json: adminList([{ id: 1, name: 'Ha Noi', slug: 'ha-noi', is_active: true }]) }),
  );
  await page.route('**/api/admin/wards**', (route) =>
    route.fulfill({
      json: adminList([{ id: 1, city: 1, city_name: 'Ha Noi', name: 'Nam Tu Liem', slug: 'nam-tu-liem', is_active: true }]),
    }),
  );
  await page.route('**/api/admin/amenities**', (route) => route.fulfill({ json: adminList([]) }));
  await page.route('**/api/admin/area-ranges**', (route) =>
    route.fulfill({ json: adminList([{ id: 1, name: '20-30 m2', min_area: '20.00', max_area: '30.00', is_active: true }]) }),
  );
  await page.route('**/api/admin/deposit-types**', (route) =>
    route.fulfill({ json: adminList([{ id: 1, name: 'Coc 1 thang', is_active: true }]) }),
  );
}
