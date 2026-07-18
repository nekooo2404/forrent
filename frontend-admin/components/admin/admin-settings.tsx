"use client";

import { Check, Pencil, Plus, RefreshCw, ShieldCheck, Trash2, UserRound, X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { authFetch } from "@/lib/auth-storage";
import type { ApiUser } from "@/lib/api";

import {
  adminList,
  adminMessageFrom,
  adminRequest,
  adminRoleLabel,
  type AdminAmenity,
  type AdminAreaRange,
  type AdminCity,
  type AdminDepositType,
  type AdminRoomSubtype,
  type AdminWard,
} from "./admin-api";
import { useAdminAuth } from "./admin-shell";
import {
  AdminEmptyState,
  AdminInlineMessage,
  AdminLoadingState,
  AdminPageHeader,
  AdminPanel,
  adminButtonPrimary,
  adminButtonSecondary,
  adminInputClass,
  adminSelectClass,
} from "./admin-ui";

type TabKey = "cities" | "wards" | "amenities" | "areas" | "depositTypes" | "roomSubtypes" | "account";

type SettingsState = {
  amenities: AdminAmenity[];
  areas: AdminAreaRange[];
  cities: AdminCity[];
  depositTypes: AdminDepositType[];
  roomSubtypes: AdminRoomSubtype[];
  wards: AdminWard[];
};

type CityForm = { id?: number; is_active: boolean; name: string; slug: string };
type WardForm = { city: string; id?: number; is_active: boolean; name: string; slug: string };
type AmenityForm = { icon: string; id?: number; is_active: boolean; name: string };
type AreaForm = { id?: number; is_active: boolean; max_area: string; min_area: string; name: string };
type DepositTypeForm = { id?: number; is_active: boolean; name: string };
type RoomSubtypeForm = { id?: number; is_active: boolean; name: string; parent_type: "CCMN" | "CCDV" };

const emptyCity: CityForm = { is_active: true, name: "", slug: "" };
const emptyWard: WardForm = { city: "", is_active: true, name: "", slug: "" };
const emptyAmenity: AmenityForm = { icon: "", is_active: true, name: "" };
const emptyArea: AreaForm = { is_active: true, max_area: "", min_area: "", name: "" };
const emptyDepositType: DepositTypeForm = { is_active: true, name: "" };
const emptyRoomSubtype: RoomSubtypeForm = { is_active: true, name: "", parent_type: "CCMN" };

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "roomSubtypes", label: "Kiểu phòng" },
  { key: "depositTypes", label: "Loại cọc" },
  { key: "cities", label: "Thành phố" },
  { key: "wards", label: "Phường" },
  { key: "amenities", label: "Tiện ích" },
  { key: "areas", label: "Diện tích" },
  { key: "account", label: "Tài khoản & bảo mật" },
];

export function AdminSettings() {
  const { refreshUser, token, user } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("cities");
  const [state, setState] = useState<SettingsState>({ amenities: [], areas: [], cities: [], depositTypes: [], roomSubtypes: [], wards: [] });
  const [cityForm, setCityForm] = useState<CityForm>(emptyCity);
  const [wardForm, setWardForm] = useState<WardForm>(emptyWard);
  const [amenityForm, setAmenityForm] = useState<AmenityForm>(emptyAmenity);
  const [areaForm, setAreaForm] = useState<AreaForm>(emptyArea);
  const [depositTypeForm, setDepositTypeForm] = useState<DepositTypeForm>(emptyDepositType);
  const [roomSubtypeForm, setRoomSubtypeForm] = useState<RoomSubtypeForm>(emptyRoomSubtype);
  const [pendingDelete, setPendingDelete] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadSettings() {
    setIsLoading(true);
    setError("");
    try {
      const [cities, wards, amenities, areas, depositTypes, roomSubtypes] = await Promise.all([
        adminList<AdminCity>("cities", token, { page_size: 100, ordering: "name" }),
        adminList<AdminWard>("wards", token, { page_size: 100, ordering: "name" }),
        adminList<AdminAmenity>("amenities", token, { page_size: 100, ordering: "name" }),
        adminList<AdminAreaRange>("area-ranges", token, { page_size: 100, ordering: "min_area" }),
        adminList<AdminDepositType>("deposit-types", token, { page_size: 100, ordering: "name" }),
        adminList<AdminRoomSubtype>("room-subtypes", token, { page_size: 100, ordering: "parent_type,name" }),
      ]);
      setState({
        amenities: amenities.results,
        areas: areas.results,
        cities: cities.results,
        depositTypes: depositTypes.results,
        roomSubtypes: roomSubtypes.results,
        wards: wards.results,
      });
    } catch (loadError) {
      setError(adminMessageFrom(loadError, "Không thể tải cấu hình hệ thống."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function saveResource(path: string, id: number | undefined, payload: Record<string, unknown>) {
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      await adminRequest<Record<string, unknown>>(id ? `${path}/${id}` : path, token, {
        body: JSON.stringify(payload),
        method: id ? "PATCH" : "POST",
      });
      setMessage(id ? "Cấu hình đã được cập nhật." : "Cấu hình mới đã được tạo.");
      setPendingDelete("");
      await loadSettings();
      return true;
    } catch (saveError) {
      setError(adminMessageFrom(saveError, "Không thể lưu cấu hình."));
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteResource(path: string, id: number) {
    const key = `${path}:${id}`;
    if (pendingDelete !== key) {
      setPendingDelete(key);
      return;
    }
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      await adminRequest<Record<string, never>>(`${path}/${id}`, token, { method: "DELETE" });
      setMessage("Cấu hình đã được xóa.");
      setPendingDelete("");
      await loadSettings();
    } catch (deleteError) {
      setError(adminMessageFrom(deleteError, "Không thể xóa cấu hình. Có thể cấu hình đang được phòng sử dụng."));
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleActive(path: string, id: number, isActive: boolean) {
    await saveResource(path, id, { is_active: !isActive });
  }

  return (
    <div>
      <AdminPageHeader
        actions={
          <button className={adminButtonSecondary} onClick={loadSettings} type="button">
            <RefreshCw size={16} strokeWidth={1.8} />
            Làm mới
          </button>
        }
        eyebrow="System configuration"
        subtitle="Quản trị dữ liệu dùng chung cho phòng, bộ lọc và quy trình vận hành."
        title="Cấu hình Hệ thống"
      />

      <div className="mb-5 space-y-3">
        <AdminInlineMessage error={error} message={message} />
      </div>

      <div className="mb-6 border-b border-outline-variant/70">
        <div aria-label="Nhóm cài đặt" className="grid grid-cols-2 gap-x-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:gap-x-8" role="tablist">
          {tabs.map((tab) => (
            <button
              aria-selected={activeTab === tab.key}
              className={`min-h-11 border-b-2 px-2 py-3 text-left text-sm font-semibold transition ${
                activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-secondary hover:text-primary"
              }`}
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <AdminLoadingState label="Đang tải cấu hình..." />
      ) : (
        <>
          {activeTab === "cities" ? (
            <CityPanel
              form={cityForm}
              isSaving={isSaving}
              items={state.cities}
              onDelete={(id) => deleteResource("cities", id)}
              onEdit={(city) => setCityForm({ id: city.id, is_active: city.is_active, name: city.name, slug: city.slug })}
              onFormChange={setCityForm}
              onReset={() => setCityForm(emptyCity)}
              onSubmit={async (event) => {
                event.preventDefault();
                const saved = await saveResource("cities", cityForm.id, {
                  is_active: cityForm.is_active,
                  name: cityForm.name.trim(),
                  slug: cityForm.slug.trim(),
                });
                if (saved) setCityForm(emptyCity);
              }}
              onToggleActive={(city) => toggleActive("cities", city.id, city.is_active)}
              pendingDelete={pendingDelete}
            />
          ) : null}

          {activeTab === "wards" ? (
            <WardPanel
              cities={state.cities}
              form={wardForm}
              isSaving={isSaving}
              items={state.wards}
              onDelete={(id) => deleteResource("wards", id)}
              onEdit={(ward) => setWardForm({ city: String(ward.city), id: ward.id, is_active: ward.is_active, name: ward.name, slug: ward.slug })}
              onFormChange={setWardForm}
              onReset={() => setWardForm(emptyWard)}
              onSubmit={async (event) => {
                event.preventDefault();
                const saved = await saveResource("wards", wardForm.id, {
                  city: Number(wardForm.city),
                  is_active: wardForm.is_active,
                  name: wardForm.name.trim(),
                  slug: wardForm.slug.trim(),
                });
                if (saved) setWardForm(emptyWard);
              }}
              onToggleActive={(ward) => toggleActive("wards", ward.id, ward.is_active)}
              pendingDelete={pendingDelete}
            />
          ) : null}

          {activeTab === "amenities" ? (
            <AmenityPanel
              form={amenityForm}
              isSaving={isSaving}
              items={state.amenities}
              onDelete={(id) => deleteResource("amenities", id)}
              onEdit={(amenity) => setAmenityForm({ icon: amenity.icon, id: amenity.id, is_active: amenity.is_active, name: amenity.name })}
              onFormChange={setAmenityForm}
              onReset={() => setAmenityForm(emptyAmenity)}
              onSubmit={async (event) => {
                event.preventDefault();
                const saved = await saveResource("amenities", amenityForm.id, {
                  icon: amenityForm.icon.trim(),
                  is_active: amenityForm.is_active,
                  name: amenityForm.name.trim(),
                });
                if (saved) setAmenityForm(emptyAmenity);
              }}
              onToggleActive={(amenity) => toggleActive("amenities", amenity.id, amenity.is_active)}
              pendingDelete={pendingDelete}
            />
          ) : null}

          {activeTab === "areas" ? (
            <AreaPanel
              form={areaForm}
              isSaving={isSaving}
              items={state.areas}
              onDelete={(id) => deleteResource("area-ranges", id)}
              onEdit={(area) => setAreaForm({ id: area.id, is_active: area.is_active, max_area: area.max_area ?? "", min_area: area.min_area, name: area.name })}
              onFormChange={setAreaForm}
              onReset={() => setAreaForm(emptyArea)}
              onSubmit={async (event) => {
                event.preventDefault();
                const saved = await saveResource("area-ranges", areaForm.id, {
                  is_active: areaForm.is_active,
                  max_area: areaForm.max_area || null,
                  min_area: areaForm.min_area,
                  name: areaForm.name.trim(),
                });
                if (saved) setAreaForm(emptyArea);
              }}
              onToggleActive={(area) => toggleActive("area-ranges", area.id, area.is_active)}
              pendingDelete={pendingDelete}
            />
          ) : null}

          {activeTab === "depositTypes" ? (
            <DepositTypePanel
              form={depositTypeForm}
              isSaving={isSaving}
              items={state.depositTypes}
              onDelete={(id) => deleteResource("deposit-types", id)}
              onEdit={(depositType) => setDepositTypeForm({ id: depositType.id, is_active: depositType.is_active, name: depositType.name })}
              onFormChange={setDepositTypeForm}
              onReset={() => setDepositTypeForm(emptyDepositType)}
              onSubmit={async (event) => {
                event.preventDefault();
                const saved = await saveResource("deposit-types", depositTypeForm.id, {
                  is_active: depositTypeForm.is_active,
                  name: depositTypeForm.name.trim(),
                });
                if (saved) setDepositTypeForm(emptyDepositType);
              }}
              onToggleActive={(depositType) => toggleActive("deposit-types", depositType.id, depositType.is_active)}
              pendingDelete={pendingDelete}
            />
          ) : null}

          {activeTab === "roomSubtypes" ? (
            <RoomSubtypePanel
              form={roomSubtypeForm}
              isSaving={isSaving}
              items={state.roomSubtypes}
              onDelete={(id) => deleteResource("room-subtypes", id)}
              onEdit={(item) => setRoomSubtypeForm({ id: item.id, is_active: item.is_active, name: item.name, parent_type: item.parent_type as "CCMN" | "CCDV" })}
              onFormChange={setRoomSubtypeForm}
              onReset={() => setRoomSubtypeForm(emptyRoomSubtype)}
              onSubmit={async (event) => {
                event.preventDefault();
                const saved = await saveResource("room-subtypes", roomSubtypeForm.id, {
                  is_active: roomSubtypeForm.is_active,
                  name: roomSubtypeForm.name.trim(),
                  parent_type: roomSubtypeForm.parent_type,
                });
                if (saved) setRoomSubtypeForm(emptyRoomSubtype);
              }}
              onToggleActive={(item) => toggleActive("room-subtypes", item.id, item.is_active)}
              pendingDelete={pendingDelete}
            />
          ) : null}

          {activeTab === "account" ? (
            <AccountSecurityPanel
              key={[user.id, user.full_name, user.email, user.phone, user.date_of_birth].join(":")}
              refreshUser={refreshUser}
              user={user}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function CityPanel(props: Readonly<{
  form: CityForm;
  isSaving: boolean;
  items: AdminCity[];
  onDelete: (id: number) => void;
  onEdit: (item: AdminCity) => void;
  onFormChange: (value: CityForm) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleActive: (item: AdminCity) => void;
  pendingDelete: string;
}>) {
  return (
    <ResourceLayout
      form={
        <form className="space-y-4" onSubmit={props.onSubmit}>
          <FormTitle editing={Boolean(props.form.id)} title="Thành phố" />
          <TextField label="Tên thành phố" onChange={(name) => props.onFormChange({ ...props.form, name })} required value={props.form.name} />
          <TextField label="Slug" onChange={(slug) => props.onFormChange({ ...props.form, slug })} placeholder="Để trống để hệ thống tự tạo" value={props.form.slug} />
          <ActiveCheckbox checked={props.form.is_active} onChange={(is_active) => props.onFormChange({ ...props.form, is_active })} />
          <FormActions editing={Boolean(props.form.id)} isSaving={props.isSaving} onReset={props.onReset} />
        </form>
      }
      list={
        props.items.length ? (
          <ResourceTable
            columns={["Tên", "Slug", "Trạng thái"]}
            rows={props.items.map((item) => ({
              cells: [item.name, item.slug, <ActivePill active={item.is_active} key="active" />],
              id: item.id,
              item,
            }))}
            onDelete={(item) => props.onDelete(item.id)}
            onEdit={props.onEdit}
            onToggleActive={props.onToggleActive}
            pendingDelete={props.pendingDelete}
            path="cities"
          />
        ) : (
          <AdminEmptyState description="Thêm thành phố để phòng có thể chọn đúng khu vực." title="Chưa có thành phố" />
        )
      }
      title="Thành phố"
    />
  );
}

function WardPanel(props: Readonly<{
  cities: AdminCity[];
  form: WardForm;
  isSaving: boolean;
  items: AdminWard[];
  onDelete: (id: number) => void;
  onEdit: (item: AdminWard) => void;
  onFormChange: (value: WardForm) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleActive: (item: AdminWard) => void;
  pendingDelete: string;
}>) {
  const cityById = useMemo(() => new Map(props.cities.map((city) => [city.id, city.name])), [props.cities]);
  return (
    <ResourceLayout
      form={
        <form className="space-y-4" onSubmit={props.onSubmit}>
          <FormTitle editing={Boolean(props.form.id)} title="Phường" />
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase text-secondary">Thành phố</span>
            <select className={adminSelectClass} onChange={(event) => props.onFormChange({ ...props.form, city: event.target.value })} required value={props.form.city}>
              <option value="">Chọn thành phố</option>
              {props.cities.map((city) => (
                <option key={city.id} value={city.id}>{city.name}</option>
              ))}
            </select>
          </label>
          <TextField label="Tên phường" onChange={(name) => props.onFormChange({ ...props.form, name })} required value={props.form.name} />
          <TextField label="Slug" onChange={(slug) => props.onFormChange({ ...props.form, slug })} placeholder="Để trống để hệ thống tự tạo" value={props.form.slug} />
          <ActiveCheckbox checked={props.form.is_active} onChange={(is_active) => props.onFormChange({ ...props.form, is_active })} />
          <FormActions editing={Boolean(props.form.id)} isSaving={props.isSaving} onReset={props.onReset} />
        </form>
      }
      list={
        props.items.length ? (
          <ResourceTable
            columns={["Tên", "Thành phố", "Trạng thái"]}
            rows={props.items.map((item) => ({
              cells: [item.name, cityById.get(item.city) ?? item.city_name, <ActivePill active={item.is_active} key="active" />],
              id: item.id,
              item,
            }))}
            onDelete={(item) => props.onDelete(item.id)}
            onEdit={props.onEdit}
            onToggleActive={props.onToggleActive}
            pendingDelete={props.pendingDelete}
            path="wards"
          />
        ) : (
          <AdminEmptyState description="Thêm phường để bộ lọc và form phòng hoạt động đúng." title="Chưa có phường" />
        )
      }
      title="Phường"
    />
  );
}

function AmenityPanel(props: Readonly<{
  form: AmenityForm;
  isSaving: boolean;
  items: AdminAmenity[];
  onDelete: (id: number) => void;
  onEdit: (item: AdminAmenity) => void;
  onFormChange: (value: AmenityForm) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleActive: (item: AdminAmenity) => void;
  pendingDelete: string;
}>) {
  return (
    <ResourceLayout
      form={
        <form className="space-y-4" onSubmit={props.onSubmit}>
          <FormTitle editing={Boolean(props.form.id)} title="Tiện ích" />
          <TextField label="Tên tiện ích" onChange={(name) => props.onFormChange({ ...props.form, name })} required value={props.form.name} />
          <TextField label="Icon" onChange={(icon) => props.onFormChange({ ...props.form, icon })} placeholder="wifi, pool, elevator..." value={props.form.icon} />
          <ActiveCheckbox checked={props.form.is_active} onChange={(is_active) => props.onFormChange({ ...props.form, is_active })} />
          <FormActions editing={Boolean(props.form.id)} isSaving={props.isSaving} onReset={props.onReset} />
        </form>
      }
      list={
        props.items.length ? (
          <ResourceTable
            columns={["Tên", "Icon", "Trạng thái"]}
            rows={props.items.map((item) => ({
              cells: [item.name, item.icon || "Không có", <ActivePill active={item.is_active} key="active" />],
              id: item.id,
              item,
            }))}
            onDelete={(item) => props.onDelete(item.id)}
            onEdit={props.onEdit}
            onToggleActive={props.onToggleActive}
            pendingDelete={props.pendingDelete}
            path="amenities"
          />
        ) : (
          <AdminEmptyState description="Tiện ích giúp public filter và chi tiết phòng hiển thị rõ hơn." title="Chưa có tiện ích" />
        )
      }
      title="Tiện ích"
    />
  );
}

function AreaPanel(props: Readonly<{
  form: AreaForm;
  isSaving: boolean;
  items: AdminAreaRange[];
  onDelete: (id: number) => void;
  onEdit: (item: AdminAreaRange) => void;
  onFormChange: (value: AreaForm) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleActive: (item: AdminAreaRange) => void;
  pendingDelete: string;
}>) {
  return (
    <ResourceLayout
      form={
        <form className="space-y-4" onSubmit={props.onSubmit}>
          <FormTitle editing={Boolean(props.form.id)} title="Khoảng diện tích" />
          <TextField label="Tên khoảng" onChange={(name) => props.onFormChange({ ...props.form, name })} required value={props.form.name} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Diện tích tối thiểu" onChange={(min_area) => props.onFormChange({ ...props.form, min_area })} required type="number" value={props.form.min_area} />
            <TextField label="Diện tích tối đa" onChange={(max_area) => props.onFormChange({ ...props.form, max_area })} placeholder="Để trống nếu không giới hạn" type="number" value={props.form.max_area} />
          </div>
          <ActiveCheckbox checked={props.form.is_active} onChange={(is_active) => props.onFormChange({ ...props.form, is_active })} />
          <FormActions editing={Boolean(props.form.id)} isSaving={props.isSaving} onReset={props.onReset} />
        </form>
      }
      list={
        props.items.length ? (
          <ResourceTable
            columns={["Tên", "Khoảng", "Trạng thái"]}
            rows={props.items.map((item) => ({
              cells: [item.name, `${item.min_area} - ${item.max_area ?? "∞"} m²`, <ActivePill active={item.is_active} key="active" />],
              id: item.id,
              item,
            }))}
            onDelete={(item) => props.onDelete(item.id)}
            onEdit={props.onEdit}
            onToggleActive={props.onToggleActive}
            pendingDelete={props.pendingDelete}
            path="area-ranges"
          />
        ) : (
          <AdminEmptyState description="Khoảng diện tích giúp phân loại và lọc phòng trên trang public." title="Chưa có khoảng diện tích" />
        )
      }
      title="Khoảng diện tích"
    />
  );
}

function DepositTypePanel(props: Readonly<{
  form: DepositTypeForm;
  isSaving: boolean;
  items: AdminDepositType[];
  onDelete: (id: number) => void;
  onEdit: (item: AdminDepositType) => void;
  onFormChange: (value: DepositTypeForm) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleActive: (item: AdminDepositType) => void;
  pendingDelete: string;
}>) {
  return (
    <ResourceLayout
      form={
        <form className="space-y-4" onSubmit={props.onSubmit}>
          <FormTitle editing={Boolean(props.form.id)} title="Loại cọc" />
          <TextField label="Tên loại cọc" onChange={(name) => props.onFormChange({ ...props.form, name })} required value={props.form.name} />
          <ActiveCheckbox checked={props.form.is_active} onChange={(is_active) => props.onFormChange({ ...props.form, is_active })} />
          <FormActions editing={Boolean(props.form.id)} isSaving={props.isSaving} onReset={props.onReset} />
        </form>
      }
      list={
        props.items.length ? (
          <ResourceTable
            columns={["Tên", "Trạng thái"]}
            rows={props.items.map((item) => ({
              cells: [item.name, <ActivePill active={item.is_active} key="active" />],
              id: item.id,
              item,
            }))}
            onDelete={(item) => props.onDelete(item.id)}
            onEdit={props.onEdit}
            onToggleActive={props.onToggleActive}
            pendingDelete={props.pendingDelete}
            path="deposit-types"
          />
        ) : (
          <AdminEmptyState description="Thêm các cách tính cọc để chọn khi tạo phòng." title="Chưa có loại cọc" />
        )
      }
      title="Loại cọc"
    />
  );
}

function RoomSubtypePanel(props: Readonly<{
  form: RoomSubtypeForm;
  isSaving: boolean;
  items: AdminRoomSubtype[];
  onDelete: (id: number) => void;
  onEdit: (item: AdminRoomSubtype) => void;
  onFormChange: (value: RoomSubtypeForm) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleActive: (item: AdminRoomSubtype) => void;
  pendingDelete: string;
}>) {
  return (
    <ResourceLayout
      form={
        <form className="space-y-4" onSubmit={props.onSubmit}>
          <FormTitle editing={Boolean(props.form.id)} title="Kiểu phòng" />
          <label className="block space-y-2 text-sm font-medium text-on-surface">
            <span>Loại hình</span>
            <select
              className={adminSelectClass}
              onChange={(event) => props.onFormChange({ ...props.form, parent_type: event.target.value as "CCMN" | "CCDV" })}
              value={props.form.parent_type}
            >
              <option value="CCMN">Chung cư mini</option>
              <option value="CCDV">Căn hộ dịch vụ</option>
            </select>
          </label>
          <TextField label="Tên kiểu phòng" onChange={(name) => props.onFormChange({ ...props.form, name })} required value={props.form.name} />
          <ActiveCheckbox checked={props.form.is_active} onChange={(is_active) => props.onFormChange({ ...props.form, is_active })} />
          <FormActions editing={Boolean(props.form.id)} isSaving={props.isSaving} onReset={props.onReset} />
        </form>
      }
      list={
        props.items.length ? (
          <ResourceTable
            columns={["Tên", "Loại hình", "Trạng thái"]}
            rows={props.items.map((item) => ({
              cells: [item.name, item.parent_type === "CCMN" ? "Chung cư mini" : "Căn hộ dịch vụ", <ActivePill active={item.is_active} key="active" />],
              id: item.id,
              item,
            }))}
            onDelete={(item) => props.onDelete(item.id)}
            onEdit={props.onEdit}
            onToggleActive={props.onToggleActive}
            pendingDelete={props.pendingDelete}
            path="room-subtypes"
          />
        ) : (
          <AdminEmptyState description="Thêm Studio, 1N1K, 1N1B và các kiểu phòng khác cho từng loại hình." title="Chưa có kiểu phòng" />
        )
      }
      title="Kiểu phòng"
    />
  );
}

function AccountSecurityPanel({
  refreshUser,
  user,
}: Readonly<{
  refreshUser: () => Promise<void>;
  user: ApiUser;
}>) {
  const [profile, setProfile] = useState({
    date_of_birth: user.date_of_birth ?? "",
    email: user.email,
    full_name: user.full_name,
    phone: user.phone,
  });
  const [password, setPassword] = useState({
    confirm_new_password: "",
    new_password: "",
    old_password: "",
  });
  const [resetEmail, setResetEmail] = useState(user.email);
  const [profileState, setProfileState] = useState({ error: "", loading: false, message: "" });
  const [passwordState, setPasswordState] = useState({ error: "", loading: false, message: "" });
  const [resetState, setResetState] = useState({ error: "", loading: false, message: "" });

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileState({ error: "", loading: true, message: "" });
    try {
      const response = await authFetch("/api/auth/profile", {
        body: JSON.stringify({ ...profile, date_of_birth: profile.date_of_birth || null }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PUT",
      });
      const payload = (await response.json()) as { data?: ApiUser; message: string; success: boolean };
      if (!response.ok || !payload.success || !payload.data) {
        setProfileState({ error: payload.message || "Không thể cập nhật thông tin.", loading: false, message: "" });
        return;
      }
      await refreshUser();
      setProfileState({ error: "", loading: false, message: "Thông tin tài khoản đã được cập nhật." });
    } catch {
      setProfileState({ error: "Không thể kết nối hệ thống cập nhật thông tin.", loading: false, message: "" });
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.new_password !== password.confirm_new_password) {
      setPasswordState({ error: "Mật khẩu xác nhận không khớp.", loading: false, message: "" });
      return;
    }
    setPasswordState({ error: "", loading: true, message: "" });
    try {
      const response = await authFetch("/api/auth/change-password", {
        body: JSON.stringify(password),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as { message: string; success: boolean };
      if (!response.ok || !payload.success) {
        setPasswordState({ error: payload.message || "Không thể đổi mật khẩu.", loading: false, message: "" });
        return;
      }
      setPassword({ confirm_new_password: "", new_password: "", old_password: "" });
      setPasswordState({ error: "", loading: false, message: "Mật khẩu đã được đổi thành công." });
    } catch {
      setPasswordState({ error: "Không thể kết nối hệ thống đổi mật khẩu.", loading: false, message: "" });
    }
  }

  async function submitPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetState({ error: "", loading: true, message: "" });
    try {
      const response = await fetch("/api/auth/password-reset", {
        body: JSON.stringify({ email: resetEmail }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as { message: string; success: boolean };
      if (!response.ok || !payload.success) {
        setResetState({ error: payload.message || "Không thể gửi email đặt lại mật khẩu.", loading: false, message: "" });
        return;
      }
      setResetState({ error: "", loading: false, message: "Nếu email tồn tại, hệ thống đã gửi hướng dẫn đặt lại mật khẩu." });
    } catch {
      setResetState({ error: "Không thể kết nối hệ thống quên mật khẩu.", loading: false, message: "" });
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <AdminPanel title="Cập nhật thông tin">
        <form className="space-y-5" onSubmit={submitProfile}>
          <div className="flex items-center gap-4 rounded-lg bg-surface-container-low p-4">
            <span className="grid size-14 place-items-center rounded-lg bg-primary text-on-primary">
              <UserRound size={24} strokeWidth={1.8} />
            </span>
            <div>
              <p className="font-semibold text-primary">{user.full_name}</p>
              <p className="text-sm text-secondary">{adminRoleLabel(user.role)} · {user.email}</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Họ và tên" onChange={(full_name) => setProfile((current) => ({ ...current, full_name }))} required value={profile.full_name} />
            <TextField label="Ngày sinh" onChange={(date_of_birth) => setProfile((current) => ({ ...current, date_of_birth }))} type="date" value={profile.date_of_birth} />
            <TextField label="Số điện thoại" onChange={(phone) => setProfile((current) => ({ ...current, phone }))} required value={profile.phone} />
            <TextField label="Email" onChange={(email) => setProfile((current) => ({ ...current, email }))} required type="email" value={profile.email} />
          </div>
          <AdminInlineMessage error={profileState.error} message={profileState.message} />
          <button className={adminButtonPrimary} disabled={profileState.loading} type="submit">
            {profileState.loading ? "Đang cập nhật..." : "Cập nhật thông tin"}
          </button>
        </form>
      </AdminPanel>

      <div className="space-y-6">
        <AdminPanel title="Đổi mật khẩu">
          <form className="space-y-4" onSubmit={submitPassword}>
            <TextField label="Mật khẩu hiện tại" onChange={(old_password) => setPassword((current) => ({ ...current, old_password }))} required type="password" value={password.old_password} />
            <TextField label="Mật khẩu mới" onChange={(new_password) => setPassword((current) => ({ ...current, new_password }))} required type="password" value={password.new_password} />
            <TextField label="Xác nhận mật khẩu mới" onChange={(confirm_new_password) => setPassword((current) => ({ ...current, confirm_new_password }))} required type="password" value={password.confirm_new_password} />
            <AdminInlineMessage error={passwordState.error} message={passwordState.message} />
            <button className={adminButtonSecondary} disabled={passwordState.loading} type="submit">
              <ShieldCheck size={16} strokeWidth={1.8} />
              {passwordState.loading ? "Đang xử lý..." : "Đổi mật khẩu"}
            </button>
          </form>
        </AdminPanel>

        <AdminPanel title="Quên mật khẩu">
          <form className="space-y-4" onSubmit={submitPasswordReset}>
            <p className="text-sm leading-6 text-secondary">
              Gửi email đặt lại mật khẩu cho tài khoản. Email được xử lý trong nền và có thể mất vài phút.
            </p>
            <TextField label="Email nhận liên kết" onChange={setResetEmail} required type="email" value={resetEmail} />
            <AdminInlineMessage error={resetState.error} message={resetState.message} />
            <button className={adminButtonPrimary} disabled={resetState.loading} type="submit">
              {resetState.loading ? "Đang gửi..." : "Gửi email đặt lại"}
            </button>
          </form>
        </AdminPanel>
      </div>
    </section>
  );
}

function ResourceLayout({
  form,
  list,
  title,
}: Readonly<{
  form: ReactNode;
  list: ReactNode;
  title: string;
}>) {
  return (
    <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <AdminPanel title={`Form ${title}`}>{form}</AdminPanel>
      <AdminPanel title={`Danh sách ${title}`}>{list}</AdminPanel>
    </section>
  );
}

function ResourceTable<T extends { id: number; is_active: boolean }>({
  columns,
  onDelete,
  onEdit,
  onToggleActive,
  path,
  pendingDelete,
  rows,
}: Readonly<{
  columns: string[];
  onDelete: (item: T) => void;
  onEdit: (item: T) => void;
  onToggleActive: (item: T) => void;
  path: string;
  pendingDelete: string;
  rows: Array<{ cells: ReactNode[]; id: number; item: T }>;
}>) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-outline-variant/70 text-xs uppercase text-secondary">
          <tr>
            {columns.map((column) => (
              <th className="py-3 pr-5 font-semibold" key={column}>{column}</th>
            ))}
            <th className="py-3 text-right font-semibold">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/70">
          {rows.map((row) => (
            <tr className="transition hover:bg-surface-container-low/70" key={row.id}>
              {row.cells.map((cell, index) => (
                <td className="py-4 pr-5 text-primary" key={`${row.id}-${index}`}>{cell}</td>
              ))}
              <td className="py-4 text-right">
                <div className="flex justify-end gap-2">
                  <button aria-label={`Sửa bản ghi ${row.id}`} className="inline-flex size-11 items-center justify-center rounded-md border border-outline-variant/70 bg-surface-container-lowest text-secondary transition-colors duration-200 hover:border-primary/40 hover:text-primary" onClick={() => onEdit(row.item)} type="button">
                    <Pencil size={16} strokeWidth={1.8} />
                  </button>
                  <button aria-label={`${row.item.is_active ? "Vô hiệu hóa" : "Kích hoạt"} bản ghi ${row.id}`} className="inline-flex size-11 items-center justify-center rounded-md border border-outline-variant/70 bg-surface-container-lowest text-secondary transition-colors duration-200 hover:border-primary/40 hover:text-primary" onClick={() => onToggleActive(row.item)} type="button">
                    {row.item.is_active ? <X size={16} strokeWidth={1.8} /> : <Check size={16} strokeWidth={1.8} />}
                  </button>
                  <button
                    aria-label={`Xóa bản ghi ${row.id}`}
                    className={`inline-flex size-11 items-center justify-center rounded-md border transition-colors duration-200 ${
                      pendingDelete === `${path}:${row.id}`
                        ? "border-error/30 bg-error-container text-error"
                        : "border-outline-variant/70 bg-surface-container-lowest text-secondary hover:border-error/40 hover:text-error"
                    }`}
                    onClick={() => onDelete(row.item)}
                    type="button"
                  >
                    <Trash2 size={16} strokeWidth={1.8} />
                  </button>
                </div>
                {pendingDelete === `${path}:${row.id}` ? <p className="mt-1 text-xs text-error">Bấm lần nữa để xóa</p> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TextField({
  label,
  onChange,
  placeholder,
  required,
  type = "text",
  value,
}: Readonly<{
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value: string;
}>) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase text-secondary">{label}</span>
      <input className={adminInputClass} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} type={type} value={value} />
    </label>
  );
}

function ActiveCheckbox({ checked, onChange }: Readonly<{ checked: boolean; onChange: (checked: boolean) => void }>) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-md bg-surface-container-low p-3 text-sm font-medium text-primary">
      <input checked={checked} className="size-4 rounded border-primary/20 text-primary focus:ring-primary" onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      Đang hoạt động
    </label>
  );
}

function ActivePill({ active }: Readonly<{ active: boolean }>) {
  return (
    <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ${active ? "bg-success-container text-success ring-success/20" : "bg-error-container text-error ring-error/20"}`}>
      {active ? "Đang hoạt động" : "Đã tắt"}
    </span>
  );
}

function FormTitle({ editing, title }: Readonly<{ editing: boolean; title: string }>) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-secondary">{editing ? "Edit" : "Create"}</p>
      <h2 className="font-headline-sm text-2xl text-on-surface">{title}</h2>
    </div>
  );
}

function FormActions({ editing, isSaving, onReset }: Readonly<{ editing: boolean; isSaving: boolean; onReset: () => void }>) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
      <button className={adminButtonPrimary} disabled={isSaving} type="submit">
        <Plus size={16} strokeWidth={1.8} />
        {isSaving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Thêm mới"}
      </button>
      {editing ? (
        <button className={adminButtonSecondary} onClick={onReset} type="button">
          Hủy sửa
        </button>
      ) : null}
    </div>
  );
}
