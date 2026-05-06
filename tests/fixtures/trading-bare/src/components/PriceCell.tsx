export interface PriceCellProps {
  value: number;
}

export function PriceCell({ value }: PriceCellProps) {
  return <span>{value.toFixed(2)}</span>;
}
