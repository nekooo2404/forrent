import type { Meta, StoryObj } from "@storybook/react";
import { FormField } from "./form-field";

const meta = {
  title: "UI/FormField",
  component: FormField,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Email",
    children: <input className="w-full rounded-md border border-outline-variant/70 bg-surface-container-lowest px-3 py-3" placeholder="your@email.com" type="email" />,
  },
};

export const WithHelperText: Story = {
  args: {
    label: "Mật khẩu",
    helperText: "Mật khẩu phải có ít nhất 8 ký tự",
    children: <input className="w-full rounded-md border border-outline-variant/70 bg-surface-container-lowest px-3 py-3" type="password" />,
  },
};

export const WithError: Story = {
  args: {
    label: "Số điện thoại",
    error: "Số điện thoại phải có 10-11 chữ số",
    children: <input className="w-full rounded-md border border-error/50 bg-surface-container-lowest px-3 py-3" type="tel" />,
  },
};

export const Required: Story = {
  args: {
    label: "Họ và tên",
    required: true,
    children: <input className="w-full rounded-md border border-outline-variant/70 bg-surface-container-lowest px-3 py-3" placeholder="Nguyễn Văn A" type="text" />,
  },
};

export const WithTextarea: Story = {
  args: {
    label: "Ghi chú",
    helperText: "Tối đa 500 ký tự",
    children: <textarea className="w-full rounded-md border border-outline-variant/70 bg-surface-container-lowest px-3 py-3" placeholder="Nhập ghi chú..." rows={4} />,
  },
};

export const WithSelect: Story = {
  args: {
    label: "Thành phố",
    required: true,
    children: (
      <select className="w-full rounded-md border border-outline-variant/70 bg-surface-container-lowest px-3 py-3">
        <option value="">Chọn thành phố</option>
        <option value="hanoi">Hà Nội</option>
        <option value="hcm">Hồ Chí Minh</option>
      </select>
    ),
  },
};
