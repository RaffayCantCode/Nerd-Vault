import { ImageResponse } from "next/og";

export const size = {
  width: 256,
  height: 256,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <div
          style={{
            width: 212,
            height: 212,
            borderRadius: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #03fcbe 0%, #9e87ff 100%)",
            boxShadow:
              "inset 0 2px 0 rgba(255,255,255,0.26), 0 20px 36px rgba(2, 8, 20, 0.34)",
          }}
        >
          <span
            style={{
              color: "#0a0e1a",
              fontSize: 114,
              lineHeight: 1,
              fontWeight: 900,
              fontFamily:
                "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
              letterSpacing: "-0.08em",
              transform: "translateY(-4px)",
            }}
          >
            NV
          </span>
        </div>
      </div>
    ),
    size,
  );
}
