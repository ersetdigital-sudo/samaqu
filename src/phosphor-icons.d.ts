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
  export const Storefront: FC<IconProps>;
  export const BookOpen: FC<IconProps>;
  export const ListChecks: FC<IconProps>;
  export const Question: FC<IconProps>;
  export const WhatsappLogo: FC<IconProps>;
  export const House: FC<IconProps>;
  export const User: FC<IconProps>;
  export const CaretDown: FC<IconProps>;
  export const Bag: FC<IconProps>;
  export const SquaresFour: FC<IconProps>;
  export const TShirt: FC<IconProps>;
}
