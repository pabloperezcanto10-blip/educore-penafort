import Image from "next/image";

type CoriumAvatarVariant = "avatar" | "full" | "waving" | "iconLight" | "iconDark" | "appIcon" | "logoHorizontal" | "wordmark";

const coriumAssets: Record<CoriumAvatarVariant, { src: string; width: number; height: number; alt: string }> = {
  avatar: {
    src: "/brand/corium/corium-avatar.png",
    width: 148,
    height: 154,
    alt: "Corium AI"
  },
  full: {
    src: "/brand/corium/corium-full.png",
    width: 230,
    height: 258,
    alt: "Corium AI"
  },
  waving: {
    src: "/brand/corium/corium-waving.png",
    width: 250,
    height: 334,
    alt: "Corium AI saludando"
  },
  iconLight: {
    src: "/brand/corium/corium-icon-light.png",
    width: 148,
    height: 154,
    alt: "Corium AI"
  },
  iconDark: {
    src: "/brand/corium/corium-icon-dark.png",
    width: 153,
    height: 154,
    alt: "Corium AI"
  },
  appIcon: {
    src: "/brand/corium/corium-app-icon.png",
    width: 154,
    height: 154,
    alt: "Corium AI"
  },
  logoHorizontal: {
    src: "/brand/corium/corium-logo-horizontal.png",
    width: 675,
    height: 258,
    alt: "Corium AI. El corazón inteligente de EducaCora"
  },
  wordmark: {
    src: "/brand/corium/corium-wordmark.png",
    width: 394,
    height: 119,
    alt: "Corium AI"
  }
};

type CoriumAvatarProps = {
  variant?: CoriumAvatarVariant;
  className?: string;
  priority?: boolean;
};

export function CoriumAvatar({ variant = "avatar", className, priority = false }: CoriumAvatarProps) {
  const asset = coriumAssets[variant];

  return (
    <Image
      src={asset.src}
      alt={asset.alt}
      width={asset.width}
      height={asset.height}
      className={className}
      priority={priority}
    />
  );
}
