"use client";

type RoomsSortFormProps = Readonly<{
  ordering: string;
  params: Record<string, string | string[] | undefined>;
}>;

export function RoomsSortForm({ ordering, params }: RoomsSortFormProps) {
  return (
    <form action="/rooms" className="w-full md:w-auto">
      {Object.entries(params).map(([key, value]) => {
        if (key === "ordering" || key === "page" || value === undefined) return null;
        const values = Array.isArray(value) ? value : [value];
        return values.filter(Boolean).map((item) => <input key={`${key}-${item}`} name={key} type="hidden" value={item} />);
      })}
      <label className="flex items-center gap-3">
        <span className="shrink-0 text-sm font-semibold text-on-surface-variant">Sắp xếp</span>
        <select
          className="min-h-11 min-w-0 flex-1 rounded-md border border-outline-variant/70 bg-surface-container-lowest px-4 py-3 font-button text-button text-on-surface shadow-sm transition-colors focus:border-primary focus:ring-primary md:w-52 md:flex-none"
          defaultValue={ordering}
          name="ordering"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option value="-created_at">Mới nhất</option>
          <option value="price">Giá thấp trước</option>
          <option value="-price">Giá cao trước</option>
          <option value="-actual_area">Diện tích lớn trước</option>
        </select>
      </label>
      <noscript>
        <button className="mt-2 min-h-11 w-full rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary" type="submit">
          Áp dụng
        </button>
      </noscript>
    </form>
  );
}
