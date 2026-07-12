import type { Meta, StoryObj } from "@storybook/react";
import { EmptyState } from "./empty-state";
import { Inbox, Search, Home } from "lucide-react";

const meta = {
  title: "UI/EmptyState",
  component: EmptyState,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Chưa có dữ liệu",
    description: "Hiện tại chưa có dữ liệu nào. Hãy thêm mới để bắt đầu.",
  },
};

export const WithIcon: Story = {
  args: {
    icon: <Inbox size={48} strokeWidth={1.5} />,
    title: "Hộp thư trống",
    description: "Bạn chưa có tin nhắn nào. Khi có tin nhắn mới, chúng sẽ xuất hiện ở đây.",
  },
};

export const WithAction: Story = {
  args: {
    icon: <Search size={48} strokeWidth={1.5} />,
    title: "Không tìm thấy kết quả",
    description: "Không có phòng nào phù hợp với tiêu chí tìm kiếm của bạn. Hãy thử điều chỉnh bộ lọc.",
    action: {
      label: "Xóa bộ lọc",
      href: "/rooms",
    },
  },
};

export const WithTwoActions: Story = {
  args: {
    icon: <Home size={48} strokeWidth={1.5} />,
    title: "Chưa có phòng",
    description: "Danh sách phòng sẽ xuất hiện tại đây sau khi được tạo trong admin.",
    action: {
      label: "Thêm phòng đầu tiên",
      onClick: () => alert("Mở form thêm phòng"),
    },
    secondaryAction: {
      label: "Xem hướng dẫn",
      href: "/docs",
    },
  },
};

export const NoRooms: Story = {
  args: {
    icon: <Home size={48} strokeWidth={1.5} />,
    title: "Không có phòng trống",
    description: "Hiện tại không có phòng trống phù hợp. Nhân viên tư vấn sẽ báo lại khi có phòng đúng khu vực và ngân sách.",
    action: {
      label: "Gửi nhu cầu thuê phòng",
      href: "/contact",
    },
    secondaryAction: {
      label: "Xóa bộ lọc",
      href: "/rooms",
      variant: "secondary",
    },
  },
};
