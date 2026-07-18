"use client";

export function SkipToContentLink() {
  return (
    <a
      className="skip-link"
      href="#main-content"
      onClick={(event) => {
        const target = document.getElementById("main-content");
        if (!target) return;
        event.preventDefault();
        target.focus();
        target.scrollIntoView({ block: "start" });
      }}
    >
      Bỏ qua điều hướng
    </a>
  );
}
