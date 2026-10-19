import type { ReactNode } from "react";
import HorizontalMenu from "../components/HorizontalMenu";

type Props = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  buttonClassName?: string;
  scrollAmount?: number;
};

/** Adaptador para manter os submenus do editor na regra horizontal global do LIVENEXUS. */
export default function HorizontalScrollContainer({
  children,
  className = "",
  contentClassName = "",
}: Props) {
  return (
    <HorizontalMenu
      ariaLabel="Opções do editor de Overlay"
      className={className}
    >
      <div className={`flex w-max min-w-max items-center ${contentClassName}`}>
        {children}
      </div>
    </HorizontalMenu>
  );
}
