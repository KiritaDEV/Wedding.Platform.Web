type HeadingLevel = 1 | 2 | 3 | 4;
type HeadingVariant = "page" | "title" | "panel" | "section";

export type HeadingProps = React.HTMLAttributes<HTMLHeadingElement> & {
  level: HeadingLevel;
  variant: HeadingVariant;
};

const variants: Record<HeadingVariant, string> = {
  page: "text-2xl font-semibold tracking-tight sm:text-3xl",
  title: "text-2xl font-semibold",
  panel: "text-lg font-semibold",
  section: "text-sm font-semibold",
};

export function Heading({
  level,
  variant,
  className = "",
  ...props
}: HeadingProps) {
  const Component = `h${level}` as "h1" | "h2" | "h3" | "h4";
  return (
    <Component className={`${variants[variant]} ${className}`} {...props} />
  );
}
