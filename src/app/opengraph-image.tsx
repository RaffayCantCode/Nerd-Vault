import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "NerdVault - Your media vault for games, film, TV, and anime";

export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <path d="M215 148H442L547 309V384L443 225H300V555H215V148Z" fill="#69BEAA"/>
  <path d="M431 284L537 447H677V148H764V554H536L431 392V284Z" fill="#2CB8C1"/>
</svg>`;

const LOGO_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG).toString("base64")}`;

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#080808",
        }}
      >
        <img
          src={LOGO_DATA_URI}
          alt=""
          width={240}
          height={240}
          style={{ display: "block" }}
        />
        <div
          style={{
            marginTop: 16,
            fontSize: 52,
            fontWeight: 700,
            color: "#eef1f7",
            letterSpacing: "0.03em",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          NerdVault
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
