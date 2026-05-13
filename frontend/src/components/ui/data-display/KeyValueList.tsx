type KeyValueItem = {
  key: string;
  value: React.ReactNode;
};

type KeyValueListProps = {
  items: KeyValueItem[];
  className?: string;
  "data-testid"?: string;
};

export function KeyValueList({
  items,
  className = "",
  "data-testid": testId,
}: KeyValueListProps) {
  return (
    <dl className={`dh-kv-list ${className}`} data-testid={testId}>
      {items.map((item, index) => (
        <div key={index} className="dh-kv-list__item">
          <dt className="dh-kv-list__key">{item.key}</dt>
          <dd className="dh-kv-list__value">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
