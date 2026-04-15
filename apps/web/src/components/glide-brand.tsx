export function GlideBrand({
  variant = "login"
}: {
  readonly variant?: "admin-header" | "login";
}) {
  const isAdminHeader = variant === "admin-header";
  const logoWidth = isAdminHeader ? 36 : 84;
  const logoHeight = isAdminHeader ? 36 : 56;
  const logoSrc = isAdminHeader ? "/glide-mark.png" : "/glide-logo.png";

  return (
    <div className="flex items-center gap-3">
      <img
        alt="Glide logo"
        className="block shrink-0 object-contain"
        height={logoHeight}
        src={logoSrc}
        width={logoWidth}
      />

      {!isAdminHeader ? (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#056b4c]">
            Glide Admin
          </p>
        </div>
      ) : null}
    </div>
  );
}
