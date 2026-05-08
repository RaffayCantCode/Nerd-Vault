import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #03fcbe 0%, #9e87ff 100%)",
          borderRadius: 40,
        }}
      >
        <span
          style={{
            color: "#0a0e1a",
            fontSize: 90,
            lineHeight: 1,
            fontWeight: 900,
            fontFamily:
              "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
            letterSpacing: "-0.06em",
          }}
        >
          NV
        </span>
      </div>
    ),
    size,
  );
}
