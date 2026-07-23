import type {
  ApiAmenity,
  ApiAreaRange,
  ApiCity,
  ApiDepositType,
  ApiRoomImage,
  ApiRoomSubtype,
  ApiWard,
} from "@/lib/api";

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, unknown>;
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type LandlordRoomSummary = {
  total: number;
  draft: number;
  pending_review: number;
  published: number;
  rented: number;
  hidden: number;
  archived: number;
};

export type LandlordRoom = {
  id: number;
  room_code: string;
  can_delete: boolean;
  title: string;
  public_title: string;
  slug: string;
  room_type: string;
  room_subtype: number | null;
  room_subtype_name: string;
  city: number | ApiCity;
  ward: number | ApiWard;
  address: string;
  price: string;
  deposit_type: number | null;
  deposit_type_name: string;
  deposit_amount: string;
  electricity_price_per_kwh: string;
  water_billing_type: "PER_PERSON" | "PER_CUBIC_METER";
  water_price_per_person: string;
  water_price_per_cubic_meter: string;
  service_fee: string;
  actual_area: string;
  area_range: number | ApiAreaRange | null;
  amenities: ApiAmenity[];
  short_description: string;
  description: string;
  thumbnail: string | null;
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "RENTED" | "HIDDEN" | "ARCHIVED" | string;
  images: ApiRoomImage[];
  created_at: string;
  updated_at: string;
};

export type LandlordRentalCandidate = {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  status: "NEW" | "CONTACTED" | "SCHEDULED" | "VIEWED" | string;
  preferred_viewing_date: string | null;
  preferred_viewing_time_slot: string;
  appointment_date: string | null;
  appointment_time_slot: string;
  can_confirm_rental: boolean;
  created_at: string;
};

export type RoomFilters = {
  cities: ApiCity[];
  wards: ApiWard[];
  amenities: ApiAmenity[];
  area_ranges: ApiAreaRange[];
  deposit_types: ApiDepositType[];
  room_types: Array<{ value: string; label: string }>;
  room_subtypes: ApiRoomSubtype[];
};

export type RoomFormState = {
  title: string;
  room_type: string;
  room_subtype: string;
  city: string;
  ward: string;
  address: string;
  price: string;
  deposit_type: string;
  deposit_amount: string;
  electricity_price_per_kwh: string;
  water_billing_type: "PER_PERSON" | "PER_CUBIC_METER";
  water_price_per_person: string;
  water_price_per_cubic_meter: string;
  service_fee: string;
  actual_area: string;
  area_range: string;
  amenities: string[];
  short_description: string;
  description: string;
};

export const emptyForm: RoomFormState = {
  title: "",
  room_type: "CCMN",
  room_subtype: "",
  city: "",
  ward: "",
  address: "",
  price: "",
  deposit_type: "",
  deposit_amount: "",
  electricity_price_per_kwh: "",
  water_billing_type: "PER_PERSON",
  water_price_per_person: "",
  water_price_per_cubic_meter: "",
  service_fee: "",
  actual_area: "",
  area_range: "",
  amenities: [],
  short_description: "",
  description: "",
};

export const pageSize = 12;

export const emptySummary: LandlordRoomSummary = {
  total: 0,
  draft: 0,
  pending_review: 0,
  published: 0,
  rented: 0,
  hidden: 0,
  archived: 0,
};

export const statusCopy: Record<string, { label: string; className: string; hint: string }> = {
  DRAFT: {
    label: "Bản nháp",
    className: "bg-surface-container-high text-on-surface",
    hint: "Chỉ bạn nhìn thấy. Hoàn thiện thông tin rồi đăng phòng khi sẵn sàng.",
  },
  PENDING_REVIEW: {
    label: "Chờ duyệt (cũ)",
    className: "bg-warning-container text-on-warning",
    hint: "Phòng thuộc workflow cũ. Bạn có thể đăng ngay hoặc rút về bản nháp.",
  },
  PUBLISHED: {
    label: "Đang hiển thị",
    className: "bg-success-container text-on-success",
    hint: "Phòng đang xuất hiện trên danh sách công khai.",
  },
  RENTED: {
    label: "Đã thuê",
    className: "bg-surface-variant text-on-surface-variant",
    hint: "Phòng đã có người thuê, chỉ có thể lưu trữ.",
  },
  HIDDEN: {
    label: "Đã ẩn",
    className: "bg-secondary-container text-on-secondary-container",
    hint: "Phòng không hiển thị với người thuê. Bạn có thể sửa hoặc đăng lại.",
  },
  ARCHIVED: {
    label: "Lưu trữ",
    className: "bg-surface-container-high text-on-surface-variant",
    hint: "Phòng được giữ lại cho lịch sử vận hành.",
  },
};
