import { ImageResponse } from "next/og";

export const alt = "NerdVault";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #1a2231 0%, #121a28 46%, #0a1018 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 1160,
            height: 590,
            borderRadius: 24,
            border: "1px solid rgba(188, 236, 255, 0.18)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 18px rgba(0,0,0,0.22)",
            background:
              "radial-gradient(circle at 28% 26%, rgba(101, 219, 255, 0.32) 0%, rgba(101, 219, 255, 0.08) 24%, rgba(255,255,255,0) 52%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 140,
              height: 140,
              borderRadius: 32,
              border: "2px solid rgba(188, 236, 255, 0.24)",
              background:
                "radial-gradient(circle at 30% 28%, rgba(101, 219, 255, 0.4) 0%, rgba(101, 219, 255, 0.1) 30%, rgba(255,255,255,0) 60%)",
              color: "#dff8ff",
              fontSize: 72,
              fontWeight: 900,
              letterSpacing: "-0.06em",
              textShadow: "0 2px 12px rgba(0, 0, 0, 0.3)",
            }}
          >
            NV
          </div>
          <div
            style={{
              color: "#dff8ff",
              fontSize: 48,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              textShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            }}
          >
            NerdVault
          </div>
          <div
            style={{
              color: "rgba(188, 236, 255, 0.6)",
              fontSize: 20,
              fontWeight: 400,
            }}
          >
            Your Universe of Entertainment
          </div>
        </div>
      </div>
    ),
    size,
  );
}
