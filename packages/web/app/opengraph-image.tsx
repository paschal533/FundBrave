import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SITE_TAGLINE } from "@/lib/seo";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const iconBuffer = await readFile(join(process.cwd(), "public/icon-mark.png"));
  const iconSrc = `data:image/png;base64,${iconBuffer.toString("base64")}`;

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
          background: "#100803",
          backgroundImage:
            "radial-gradient(circle at 25% 20%, rgba(255,138,92,0.25), transparent 55%), radial-gradient(circle at 80% 75%, rgba(224,106,60,0.2), transparent 50%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) requires a plain <img>, not next/image */}
        <img src={iconSrc} width={140} height={160} alt="" />
        <div
          style={{
            marginTop: 28,
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            backgroundImage: "linear-gradient(90deg, #ff8a5c 0%, #e06a3c 100%)",
            backgroundClip: "text",
            color: "transparent",
            display: "flex",
          }}
        >
          FundBrave
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 32,
            color: "rgba(255,255,255,0.75)",
            maxWidth: 820,
            textAlign: "center",
            display: "flex",
          }}
        >
          {SITE_TAGLINE}
        </div>
      </div>
    ),
    { ...size }
  );
}
