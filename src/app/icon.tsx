import { ImageResponse } from "next/og";

export const size = { width: 256, height: 256 };
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
          background: "#0b1220",
          borderRadius: 56,
        }}
      >
        <svg width="180" height="180" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
          <path d="M215 148H442L547 309V384L443 225H300V555H215V148Z" fill="#69BEAA"/>
          <path d="M431 284L537 447H677V148H764V554H536L431 392V284Z" fill="#2CB8C1"/>
        </svg>
      </div>
    ),
    size,
  );
}
