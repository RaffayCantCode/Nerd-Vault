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
          background: "linear-gradient(145deg, #101b2a 0%, #0f2c36 46%, #09151c 100%)",
          color: "#e6f8ff",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
          <svg width="180" height="180" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
            <path d="M215 148H442L547 309V384L443 225H300V555H215V148Z" fill="#69BEAA"/>
            <path d="M431 284L537 447H677V148H764V554H536L431 392V284Z" fill="#2CB8C1"/>
          </svg>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: "-0.02em" }}>NerdVault</div>
            <div style={{ fontSize: 32, color: "rgba(188,236,255,0.82)" }}>Your world of entertainment. Organized.</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
