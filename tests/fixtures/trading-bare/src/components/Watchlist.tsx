import { PriceCell } from './PriceCell';

const ROWS = [
  { symbol: 'AAPL', price: 230.12, delta: -1.23 },
  { symbol: 'MSFT', price: 412.55, delta:  2.04 },
  { symbol: 'NVDA', price: 145.81, delta:  0.51 },
];

export interface WatchlistProps {
  onSelect?: (symbol: string) => void;
}

export function Watchlist({ onSelect }: WatchlistProps) {
  return (
    <table>
      <thead>
        <tr><th>Symbol</th><th>Price</th><th>Delta</th></tr>
      </thead>
      <tbody>
        {ROWS.map(r => (
          <tr key={r.symbol} onClick={() => onSelect?.(r.symbol)}>
            <td>{r.symbol}</td>
            <td><PriceCell value={r.price} /></td>
            <td><PriceCell value={r.delta} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
