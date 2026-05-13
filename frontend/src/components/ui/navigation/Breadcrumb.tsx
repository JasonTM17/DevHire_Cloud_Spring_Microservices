type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
  "data-testid"?: string;
};

export function Breadcrumb({
  items,
  className = "",
  "data-testid": testId,
}: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`dh-breadcrumb ${className}`}
      data-testid={testId}
    >
      <ol className="dh-breadcrumb__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="dh-breadcrumb__item">
              {item.href && !isLast ? (
                <a href={item.href} className="dh-breadcrumb__link">
                  {item.label}
                </a>
              ) : (
                <span
                  className="dh-breadcrumb__current"
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span className="dh-breadcrumb__separator" aria-hidden="true">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
