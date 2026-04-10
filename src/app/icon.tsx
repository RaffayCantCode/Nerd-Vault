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
            "linear-gradient(145deg, #1a2231 0%, #121a28 46%, #0a1018 100%)",
          borderRadius: 18,
          color: "#dff8ff",
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: "-0.14em",
          textShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 56,
            height: 56,
            borderRadius: 17,
            border: "1px solid rgba(188, 236, 255, 0.18)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 18px rgba(0,0,0,0.22)",
            background:
              "radial-gradient(circle at 28% 26%, rgba(101, 219, 255, 0.32) 0%, rgba(101, 219, 255, 0.08) 24%, rgba(255,255,255,0) 52%)",
          }}
        />
        <span
          style={{
            display: "flex",
            transform: "translateY(-1px)",
            zIndex: 1,
          }}
        >
          NV
        </span>
      </div>
    ),
    size,
  );
}
