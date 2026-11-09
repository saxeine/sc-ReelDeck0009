import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

/** The source studios' customizable containers use their supplied defaults. */
interface Props extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  ibcId: string;
  as?: "div" | "section";
  componentType?: string;
  defaultTitle?: string;
  defaultLabel?: string;
  children?: ReactNode | ((props: { title: string; isHidden: boolean; config: undefined }) => ReactNode);
}
export const CustomizableContainer = forwardRef<HTMLElement, Props>(function CustomizableContainer(
  { ibcId, as: Component = "div", componentType: _componentType, defaultTitle, defaultLabel, children, ...props }, ref,
) {
  return <Component {...props} ref={ref as React.Ref<HTMLDivElement>} data-editor-container={ibcId}>
    {typeof children === "function" ? children({ title: defaultTitle ?? defaultLabel ?? "", isHidden: false, config: undefined }) : children}
  </Component>;
});
