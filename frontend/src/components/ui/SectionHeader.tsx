import Link from "next/link";

type SectionHeaderProps = {
  title: string;
  linkText?: string;
  linkHref?: string;
};

export function SectionHeader({ title, linkText, linkHref }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      {linkText && linkHref && (
        <Link href={linkHref} className="section-header__link">
          {linkText} <span aria-hidden="true">-&gt;</span>
        </Link>
      )}
    </div>
  );
}
