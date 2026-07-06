/**
 * Validation utilities for form fields
 */

export const validators = {
  email: (value: string): string => {
    if (!value.trim()) return "Vui lòng nhập email";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "Email không hợp lệ";
    }
    return "";
  },

  phone: (value: string): string => {
    if (!value.trim()) return "Vui lòng nhập số điện thoại";
    const cleaned = value.replace(/[\s\-()]/g, "");
    if (!/^\d{10,11}$/.test(cleaned)) {
      return "Số điện thoại phải có 10-11 chữ số";
    }
    return "";
  },

  password: (value: string): string => {
    if (!value) return "Vui lòng nhập mật khẩu";
    if (value.length < 8) {
      return "Mật khẩu phải có ít nhất 8 ký tự";
    }
    return "";
  },

  required: (value: string, fieldName: string): string => {
    if (!value.trim()) return `Vui lòng nhập ${fieldName}`;
    return "";
  },

  minLength: (value: string, min: number, fieldName: string): string => {
    if (value.length < min) {
      return `${fieldName} phải có ít nhất ${min} ký tự`;
    }
    return "";
  },

  confirmPassword: (password: string, confirmPassword: string): string => {
    if (password !== confirmPassword) {
      return "Mật khẩu xác nhận không khớp";
    }
    return "";
  },

  otp: (value: string): string => {
    if (!value.trim()) return "Vui lòng nhập mã OTP";
    if (!/^\d{6}$/.test(value)) {
      return "Mã OTP phải có 6 chữ số";
    }
    return "";
  },
};

/**
 * Password strength checker
 */
export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  width: string;
  className: string;
} {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;

  const strengthMap = {
    0: { label: "Yếu", width: "33%", className: "bg-error" },
    1: { label: "Trung bình", width: "66%", className: "bg-warning" },
    2: { label: "Mạnh", width: "100%", className: "bg-success" },
    3: { label: "Rất mạnh", width: "100%", className: "bg-success" },
  };

  return { score, ...strengthMap[score as keyof typeof strengthMap] };
}

/**
 * Normalize phone number (remove formatting)
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, "");
}
