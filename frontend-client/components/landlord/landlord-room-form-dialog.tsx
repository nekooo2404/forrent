import type { FormEvent, ReactNode, RefObject } from "react";

import { CheckCircle2, LoaderCircle } from "@/components/ui/icons";
import type { ApiRoomSubtype, ApiWard } from "@/lib/api";

import type { LandlordRoom, RoomFilters, RoomFormState } from "./landlord-room-types";

type FormFieldChange = <K extends keyof RoomFormState>(field: K, value: RoomFormState[K]) => void;

type LandlordRoomFormDialogProps = {
  availableSubtypes: ApiRoomSubtype[];
  availableWards: ApiWard[];
  dialogRef: RefObject<HTMLDivElement | null>;
  discardButtonRef: RefObject<HTMLButtonElement | null>;
  editingRoom: LandlordRoom | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  filters: RoomFilters | null;
  form: RoomFormState;
  formError: string;
  isDiscardPromptOpen: boolean;
  isSaving: boolean;
  onCityChange: (value: string) => void;
  onCloseRequest: () => void;
  onContinueEditing: () => void;
  onDiscardChanges: () => void;
  onFieldChange: FormFieldChange;
  onRoomTypeChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleAmenity: (id: number) => void;
  selectedAmenityIds: Set<string>;
};

function fieldId(room: LandlordRoom | null, name: keyof RoomFormState) {
  return `landlord-room-${room?.id ?? "new"}-${name}`;
}

export function LandlordRoomFormDialog({
  availableSubtypes,
  availableWards,
  dialogRef,
  discardButtonRef,
  editingRoom,
  fileInputRef,
  filters,
  form,
  formError,
  isDiscardPromptOpen,
  isSaving,
  onCityChange,
  onCloseRequest,
  onContinueEditing,
  onDiscardChanges,
  onFieldChange,
  onRoomTypeChange,
  onSubmit,
  onToggleAmenity,
  selectedAmenityIds,
}: Readonly<LandlordRoomFormDialogProps>) {
  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-inverse-surface/55 px-4 py-8 backdrop-blur-sm">
      <div
        aria-labelledby="landlord-room-form-title"
        aria-modal="true"
        className="mx-auto max-w-4xl rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-5 shadow-high md:p-7"
        ref={dialogRef}
        role="dialog"
      >
        <div className="flex flex-col gap-3 border-b border-outline-variant/70 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-tertiary">Phòng cho thuê</p>
            <h2 className="mt-2 font-headline-sm text-2xl text-on-surface" id="landlord-room-form-title">
              {editingRoom ? "Sửa thông tin phòng" : "Thêm phòng mới"}
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Lưu bản nháp để kiểm tra lại, sau đó bạn có thể tự đăng phòng ngay.
            </p>
          </div>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-outline-variant/70 px-4 text-sm font-semibold text-on-surface"
            disabled={isSaving}
            onClick={onCloseRequest}
            type="button"
          >
            Đóng
          </button>
        </div>

        {formError ? (
          <div className="mt-5 rounded-md border border-error/30 bg-error-container p-3 text-sm text-on-error-container">
            {formError}
          </div>
        ) : null}

        <form className="mt-6 grid gap-5" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField id={fieldId(editingRoom, "title")} label="Tên phòng" required value={form.title} onChange={(value) => onFieldChange("title", value)} />
            <TextField id={fieldId(editingRoom, "address")} label="Địa chỉ" required value={form.address} onChange={(value) => onFieldChange("address", value)} />
            <SelectField
              id={fieldId(editingRoom, "room_type")}
              label="Loại phòng"
              value={form.room_type}
              onChange={onRoomTypeChange}
            >
              {(filters?.room_types ?? []).map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </SelectField>
            <SelectField id={fieldId(editingRoom, "room_subtype")} label="Kiểu phòng" value={form.room_subtype} onChange={(value) => onFieldChange("room_subtype", value)}>
              <option value="">Không chọn</option>
              {availableSubtypes.map((subtype) => (
                <option key={subtype.id} value={subtype.id}>
                  {subtype.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              id={fieldId(editingRoom, "city")}
              label="Thành phố"
              required
              value={form.city}
              onChange={onCityChange}
            >
              <option value="">Chọn thành phố</option>
              {(filters?.cities ?? []).map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </SelectField>
            <SelectField id={fieldId(editingRoom, "ward")} label="Phường" required value={form.ward} onChange={(value) => onFieldChange("ward", value)}>
              <option value="">Chọn phường</option>
              {availableWards.map((ward) => (
                <option key={ward.id} value={ward.id}>
                  {ward.name}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <TextField id={fieldId(editingRoom, "price")} inputMode="numeric" label="Giá thuê/tháng" required value={form.price} onChange={(value) => onFieldChange("price", value)} />
            <SelectField id={fieldId(editingRoom, "deposit_type")} label="Loại cọc" value={form.deposit_type} onChange={(value) => onFieldChange("deposit_type", value)}>
              <option value="">Không chọn</option>
              {(filters?.deposit_types ?? []).map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </SelectField>
            <TextField id={fieldId(editingRoom, "deposit_amount")} inputMode="numeric" label="Số tiền cọc" value={form.deposit_amount} onChange={(value) => onFieldChange("deposit_amount", value)} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <TextField id={fieldId(editingRoom, "electricity_price_per_kwh")} inputMode="numeric" label="Điện/kWh" value={form.electricity_price_per_kwh} onChange={(value) => onFieldChange("electricity_price_per_kwh", value)} />
            <SelectField id={fieldId(editingRoom, "water_billing_type")} label="Cách tính nước" value={form.water_billing_type} onChange={(value) => onFieldChange("water_billing_type", value as RoomFormState["water_billing_type"])}>
              <option value="PER_PERSON">Theo đầu người</option>
              <option value="PER_CUBIC_METER">Theo số khối</option>
            </SelectField>
            {form.water_billing_type === "PER_CUBIC_METER" ? (
              <TextField id={fieldId(editingRoom, "water_price_per_cubic_meter")} inputMode="numeric" label="Nước/m³" value={form.water_price_per_cubic_meter} onChange={(value) => onFieldChange("water_price_per_cubic_meter", value)} />
            ) : (
              <TextField id={fieldId(editingRoom, "water_price_per_person")} inputMode="numeric" label="Nước/người" value={form.water_price_per_person} onChange={(value) => onFieldChange("water_price_per_person", value)} />
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <TextField id={fieldId(editingRoom, "service_fee")} inputMode="numeric" label="Phí dịch vụ/tháng" value={form.service_fee} onChange={(value) => onFieldChange("service_fee", value)} />
            <TextField id={fieldId(editingRoom, "actual_area")} inputMode="decimal" label="Diện tích thực tế" required value={form.actual_area} onChange={(value) => onFieldChange("actual_area", value)} />
            <SelectField id={fieldId(editingRoom, "area_range")} label="Khoảng diện tích" required value={form.area_range} onChange={(value) => onFieldChange("area_range", value)}>
              <option value="">Không chọn</option>
              {(filters?.area_ranges ?? []).map((range) => (
                <option key={range.id} value={range.id}>
                  {range.name}
                </option>
              ))}
            </SelectField>
          </div>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-on-surface">Tiện ích</legend>
            <div className="grid max-h-52 gap-2 overflow-y-auto rounded-md border border-outline-variant/70 bg-surface-container-low p-3 sm:grid-cols-2 md:grid-cols-3">
              {(filters?.amenities ?? []).map((amenity) => (
                <label className="flex min-h-11 items-center gap-2 rounded px-2 text-sm text-on-surface hover:bg-surface-container" key={amenity.id}>
                  <input
                    checked={selectedAmenityIds.has(String(amenity.id))}
                    className="h-4 w-4 accent-primary"
                    onChange={() => onToggleAmenity(amenity.id)}
                    type="checkbox"
                  />
                  {amenity.name}
                </label>
              ))}
            </div>
          </fieldset>

          <TextAreaField id={fieldId(editingRoom, "short_description")} label="Mô tả ngắn" value={form.short_description} onChange={(value) => onFieldChange("short_description", value)} />
          <TextAreaField id={fieldId(editingRoom, "description")} label="Mô tả chi tiết" required rows={5} value={form.description} onChange={(value) => onFieldChange("description", value)} />

          <div>
            <label className="mb-2 block text-sm font-semibold text-on-surface" htmlFor="landlord-room-media">
              Ảnh hoặc video phòng
            </label>
            <input
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
              className="block min-h-11 w-full rounded-md border border-outline-variant/70 bg-surface-container-low px-3 py-2 text-sm text-on-surface file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-on-primary"
              id="landlord-room-media"
              multiple
              ref={fileInputRef}
              type="file"
            />
            <p className="mt-2 text-xs text-on-surface-variant">Tối đa 12 mục, tổng dung lượng upload mới không quá 50MB.</p>
          </div>

          {isDiscardPromptOpen ? (
            <div className="rounded-md border border-warning/40 bg-warning-container p-4" role="alert">
              <p className="font-semibold text-on-warning">Bỏ các thay đổi chưa lưu?</p>
              <p className="mt-1 text-sm leading-6 text-on-warning/85">
                Thông tin và tệp bạn vừa chọn sẽ không được lưu nếu đóng biểu mẫu.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-on-warning/25 px-4 font-semibold text-on-warning"
                  onClick={onContinueEditing}
                  type="button"
                >
                  Tiếp tục chỉnh sửa
                </button>
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-on-warning px-4 font-semibold text-warning-container"
                  onClick={onDiscardChanges}
                  ref={discardButtonRef}
                  type="button"
                >
                  Bỏ thay đổi
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-outline-variant/70 pt-5 sm:flex-row sm:justify-end">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-outline-variant/70 px-4 font-semibold text-on-surface"
              disabled={isSaving}
              onClick={onCloseRequest}
              type="button"
            >
              Hủy
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 font-semibold text-on-primary hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? <LoaderCircle className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              {editingRoom ? "Lưu thay đổi" : "Tạo bản nháp"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TextField({
  id,
  inputMode,
  label,
  onChange,
  required,
  value,
}: Readonly<{
  id: string;
  inputMode?: "decimal" | "numeric";
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}>) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block text-sm font-semibold text-on-surface">{label}</span>
      <input
        className="min-h-11 w-full rounded-md border border-outline-variant/70 bg-surface-container-low px-3 text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
        id={id}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        value={value}
      />
    </label>
  );
}

function SelectField({
  children,
  id,
  label,
  onChange,
  required,
  value,
}: Readonly<{
  children: ReactNode;
  id: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}>) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block text-sm font-semibold text-on-surface">{label}</span>
      <select
        className="min-h-11 w-full rounded-md border border-outline-variant/70 bg-surface-container-low px-3 text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}

function TextAreaField({
  id,
  label,
  onChange,
  required,
  rows = 3,
  value,
}: Readonly<{
  id: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  rows?: number;
  value: string;
}>) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block text-sm font-semibold text-on-surface">{label}</span>
      <textarea
        className="w-full rounded-md border border-outline-variant/70 bg-surface-container-low px-3 py-3 text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        rows={rows}
        value={value}
      />
    </label>
  );
}
