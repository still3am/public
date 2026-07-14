export const LOGO_URL =
  "https://media.base44.com/images/public/user_6a5155a801ae4d5ca6b4cef9/5bedc8ddf_IMG_9009.png";

export default function Logo({ size = 28, className = "" }) {
  return (
    <img
      src={LOGO_URL}
      alt="PUBLIC."
      className={className}
      style={{ height: size, width: "auto", display: "block" }}
      draggable={false}
    />
  );
}