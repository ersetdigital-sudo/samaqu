declare module "@phosphor-icons/react" {
  import { FC, SVGProps } from "react";
  interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
    weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
    mirrored?: boolean;
  }
  export const CoatHanger: FC<IconProps>;
  export const Ruler: FC<IconProps>;
  export const ChatCircle: FC<IconProps>;
  export const Package: FC<IconProps>;
}
