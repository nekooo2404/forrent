/**
 * Validation utilities for admin forms
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

  required: (value: string, fieldName: string): string => {
    if (!value.trim()) return `Vui lòng nhập ${fieldName}`;
    return "";
  },

  number: (value: string, fieldName: string): string => {
    if (!value) return `Vui lòng nhập ${fieldName}`;
    if (isNaN(Number(value)) || Number(value) < 0) {
      return `${fieldName} phải là số dương`;
    }
    return "";
  },

  minValue: (value: number, min: number, fieldName: string): string => {
    if (value < min) {
      return `${fieldName} phải lớn hơn hoặc bằng ${min}`;
    }
    return "";
  },

  maxValue: (value: number, max: number, fieldName: string): string => {
    if (value > max) {
      return `${fieldName} phải nhỏ hơn hoặc bằng ${max}`;
    }
    return "";
  },
};
