import type { ImgHTMLAttributes, SyntheticEvent } from "react";

const FALLBACK_ICON = "assets/items/placeholder.png";

interface MinecraftItemIconProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string | null | undefined;
}

/** Displays an icon produced from the Minecraft 1.21.10 item model. */
export function MinecraftItemIcon({ src, onError, loading = "lazy", decoding = "async", ...props }: MinecraftItemIconProps) {
  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    onError?.(event);
    const image = event.currentTarget;
    if (image.dataset.fallbackApplied === "true") return;
    image.dataset.fallbackApplied = "true";
    image.src = FALLBACK_ICON;
  };

  return <img {...props} src={src || FALLBACK_ICON} loading={loading} decoding={decoding} onError={handleError}/>;
}
