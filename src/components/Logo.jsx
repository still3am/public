export const LOGO_URL =
"https://media.base44.com/images/public/6a5676aa61ea8a51237aa4ee/89dfc5da1_IMG_9177.png";

export default function Logo({ size = 34, className = "" }) {
  return (
    <img
      src={LOGO_URL}
      alt="PUBLIC."
      className={`logo-dark-invert ${className}`}
      style={{ height: size, width: "auto", display: "block" }}
      draggable={false} />);


}