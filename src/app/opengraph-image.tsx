import { ImageResponse } from "next/og";

export const alt = "LIVRA — Luxury Press-On Nails in Bangladesh";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#161618",
          padding: "60px",
          position: "relative",
        }}
      >
        {/* Fine Gold Border Frame */}
        <div
          style={{
            position: "absolute",
            top: 24,
            left: 24,
            right: 24,
            bottom: 24,
            border: "2px solid #D4AF37",
            opacity: 0.4,
            display: "flex",
          }}
        />

        {/* Brand Name */}
        <div
          style={{
            fontSize: 72,
            fontFamily: "Georgia, serif",
            letterSpacing: "0.2em",
            color: "#FAF7F2",
            marginBottom: 16,
            textTransform: "uppercase",
          }}
        >
          LIVRA
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            fontFamily: "sans-serif",
            letterSpacing: "0.15em",
            color: "#D4AF37",
            textTransform: "uppercase",
            marginBottom: 32,
          }}
        >
          Luxury Press-On Nails
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 22,
            fontFamily: "sans-serif",
            color: "#A1A1AA",
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.5,
            marginBottom: 40,
          }}
        >
          Salon-perfect, damage-free press-on nails handcrafted in Dhaka.
          Reusable luxury delivered across Bangladesh.
        </div>

        {/* Feature Pill Badges */}
        <div
          style={{
            display: "flex",
            gap: "16px",
          }}
        >
          <div
            style={{
              padding: "10px 24px",
              backgroundColor: "#27272A",
              color: "#FAF7F2",
              fontSize: 14,
              fontFamily: "sans-serif",
              letterSpacing: "0.1em",
              borderRadius: "100px",
              border: "1px solid #3F3F46",
              textTransform: "uppercase",
            }}
          >
            Handcrafted in Dhaka
          </div>
          <div
            style={{
              padding: "10px 24px",
              backgroundColor: "#27272A",
              color: "#FAF7F2",
              fontSize: 14,
              fontFamily: "sans-serif",
              letterSpacing: "0.1em",
              borderRadius: "100px",
              border: "1px solid #3F3F46",
              textTransform: "uppercase",
            }}
          >
            Damage-Free & Reusable
          </div>
          <div
            style={{
              padding: "10px 24px",
              backgroundColor: "#27272A",
              color: "#FAF7F2",
              fontSize: 14,
              fontFamily: "sans-serif",
              letterSpacing: "0.1em",
              borderRadius: "100px",
              border: "1px solid #3F3F46",
              textTransform: "uppercase",
            }}
          >
            bKash & Nagad
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}

