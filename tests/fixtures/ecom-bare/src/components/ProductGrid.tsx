const PRODUCTS = [
  { id: 'a', name: 'Wool Runner', price: 110 },
  { id: 'b', name: 'Tree Dasher', price: 135 },
];

export interface ProductGridProps {
  onSelect?: (id: string) => void;
}

export function ProductGrid({ onSelect }: ProductGridProps) {
  return (
    <div>
      {PRODUCTS.map(p => (
        <div key={p.id} onClick={() => onSelect?.(p.id)}>
          <strong>{p.name}</strong> ${p.price}
        </div>
      ))}
    </div>
  );
}
