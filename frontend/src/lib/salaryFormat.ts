function hasValue(value?: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatVndMillions(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatSalaryRange(min?: number, max?: number): string {
  const hasMin = hasValue(min);
  const hasMax = hasValue(max);

  if (!hasMin && !hasMax) {
    return "Thương lượng";
  }

  const values = [min, max].filter(hasValue);
  const looksLikeUsd = values.some((value) => value >= 1000);

  if (looksLikeUsd) {
    if (hasMin && hasMax) return `${formatUsd(min!)} - ${formatUsd(max!)} / month`;
    if (hasMin) return `From ${formatUsd(min!)} / month`;
    return `Up to ${formatUsd(max!)} / month`;
  }

  if (hasMin && hasMax) {
    return `${formatVndMillions(min!)} - ${formatVndMillions(max!)} triệu VND / tháng`;
  }
  if (hasMin) return `Từ ${formatVndMillions(min!)} triệu VND / tháng`;
  return `Đến ${formatVndMillions(max!)} triệu VND / tháng`;
}
