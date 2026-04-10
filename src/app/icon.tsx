import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
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
          background:
            "radial-gradient(circle at 30% 25%, #d6f3ff 0%, #69d2ff 28%, #0b1d2c 72%, #04080d 100%)",
          borderRadius: 18,
          color: "#f8fbff",
          fontSize: 38,
          fontWeight: 900,
          letterSpacing: "-0.08em",
          textShadow: "0 6px 18px rgba(0, 0, 0, 0.35)",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 52,
            height: 52,
            borderRadius: 16,
            border: "2px solid rgba(255,255,255,0.24)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
          }}
        />
        <span
          style={{
            display: "flex",
            transform: "translateY(-1px)",
          }}
        >
          N
        </span>
      </div>
    ),
    size,
  );
}
