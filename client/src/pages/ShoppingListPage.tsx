import { useState, useEffect, useCallback, type FormEvent } from 'react';
import type { ShoppingListItem, FoodCategory } from '../types';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';

/* ---- Constants ---- */

const STORAGE_KEY = 'fridgetrack-shopping-list';

/* ---- Shopping category grouping ---- */

type ShoppingCategory = 'all' | 'produce' | 'dairy' | 'protein' | 'pantry' | 'other';

const categoryTabs: { key: ShoppingCategory; label: string }[] = [
  { key: 'all',     label: 'All' },
  { key: 'produce', label: 'Produce' },
  { key: 'dairy',   label: 'Dairy' },
  { key: 'protein', label: 'Protein' },
  { key: 'pantry',  label: 'Pantry' },
  { key: 'other',   label: 'Other' },
];

function toShoppingCategory(cat?: FoodCategory): ShoppingCategory {
  if (!cat) return 'other';
  switch (cat) {
    case 'produce':    return 'produce';
    case 'dairy':      return 'dairy';
    case 'meat':
    case 'seafood':    return 'protein';
    case 'grains':
    case 'condiments':
    case 'snacks':     return 'pantry';
    default:           return 'other';
  }
}

/* ---- Auto-categorization ---- */

const CATEGORY_PATTERNS: [RegExp, FoodCategory][] = [
  [/apple|banana|tomato|lettuce|spinach|carrot|onion|pepper|broccoli|avocado|potato|garlic|celery|cucumber|berr|grape|orange|lemon|lime|mango|peach|pear|melon|corn|mushroom|zucchini|squash|kale|cabbage|fruit|veggie|vegetable|salad|herb|cilantro|parsley|basil|mint/i, 'produce'],
  [/milk|cheese|yogurt|butter|cream|egg|sour cream|whip/i, 'dairy'],
  [/chicken|beef|pork|turkey|steak|bacon|sausage|ham|fish|salmon|shrimp|tuna|crab|lobster|tofu|tempeh|lamb|wing/i, 'meat'],
  [/rice|pasta|bread|flour|sugar|salt|oil|vinegar|sauce|cereal|oat|bean|lentil|nut|honey|jam|peanut|spice|seasoning|noodle|cracker|chip|cookie|tortilla|wrap/i, 'grains'],
  [/water|juice|soda|coffee|tea|beer|wine|drink|kombucha/i, 'beverages'],
  [/frozen|ice cream|popsicle/i, 'frozen'],
];

function autoCategorize(name: string): FoodCategory {
  const lower = name.toLowerCase();
  for (const [pattern, category] of CATEGORY_PATTERNS) {
    if (pattern.test(lower)) return category;
  }
  return 'other';
}

/* ---- Helpers ---- */

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadItems(): ShoppingListItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ShoppingListItem[];
  } catch {
    return [];
  }
}

function saveItems(items: ShoppingListItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/* ---- Icons ---- */

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 10a4 4 0 0 1-8 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 6 9 17l-5-5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---- Shopping Item Row ---- */

interface ShoppingItemRowProps {
  item: ShoppingListItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function ShoppingItemRow({ item, onToggle, onDelete }: ShoppingItemRowProps) {
  const shopCat = toShoppingCategory(item.category);

  return (
    <div
      className={[
        'group flex items-center gap-3',
        'px-4 py-3 rounded-lg',
        'bg-white border border-neutral-200',
        'transition-all duration-200 ease-in-out',
        item.purchased && 'bg-neutral-50 border-neutral-100',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Checkbox */}
      <button
        type="button"
        role="checkbox"
        aria-checked={item.purchased}
        aria-label={`Mark ${item.item_name} as ${item.purchased ? 'not purchased' : 'purchased'}`}
        onClick={() => onToggle(item.id)}
        className={[
          'shrink-0 flex items-center justify-center',
          'w-5 h-5 rounded border-2',
          'transition-all duration-200',
          'cursor-pointer',
          item.purchased
            ? 'bg-brand-500 border-brand-500 text-white'
            : 'border-neutral-300 hover:border-brand-400',
        ].join(' ')}
      >
        {item.purchased && <CheckIcon />}
      </button>

      {/* Item name */}
      <span
        className={[
          'flex-1 min-w-0 text-sm font-medium truncate',
          'transition-all duration-200',
          item.purchased
            ? 'line-through text-neutral-400'
            : 'text-neutral-900',
        ].join(' ')}
      >
        {item.item_name}
      </span>

      {/* Quantity badge */}
      {item.quantity != null && item.quantity > 1 && (
        <Badge size="sm" variant="neutral">
          {item.quantity}x
        </Badge>
      )}

      {/* Category label */}
      <span
        className={[
          'shrink-0 text-xs capitalize',
          'transition-colors duration-200',
          item.purchased ? 'text-neutral-300' : 'text-neutral-400',
        ].join(' ')}
      >
        {shopCat}
      </span>

      {/* Delete button */}
      <button
        type="button"
        aria-label={`Delete ${item.item_name}`}
        onClick={() => onDelete(item.id)}
        className={[
          'shrink-0 p-1.5 rounded-md',
          'text-neutral-300 hover:text-danger hover:bg-danger-light',
          'transition-all duration-200',
          'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
          'cursor-pointer',
        ].join(' ')}
      >
        <TrashIcon />
      </button>
    </div>
  );
}

/* ---- Page Component ---- */

export default function ShoppingListPage() {
  const [items, setItems] = useState<ShoppingListItem[]>(() => loadItems());
  const [inputValue, setInputValue] = useState('');
  const [activeTab, setActiveTab] = useState<ShoppingCategory>('all');

  // Persist on every change
  useEffect(() => {
    saveItems(items);
  }, [items]);

  // Add item
  const addItem = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const name = inputValue.trim();
      if (!name) return;

      const category = autoCategorize(name);
      const newItem: ShoppingListItem = {
        id: generateId(),
        item_name: name,
        added_at: new Date().toISOString(),
        purchased: false,
        category,
      };

      setItems((prev) => [newItem, ...prev]);
      setInputValue('');
    },
    [inputValue],
  );

  // Toggle purchased
  const togglePurchased = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, purchased: !item.purchased } : item,
      ),
    );
  }, []);

  // Delete item
  const deleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Clear completed
  const clearCompleted = useCallback(() => {
    setItems((prev) => prev.filter((item) => !item.purchased));
  }, []);

  // Category counts
  const categoryCounts: Record<ShoppingCategory, number> = {
    all:     items.length,
    produce: items.filter((i) => toShoppingCategory(i.category) === 'produce').length,
    dairy:   items.filter((i) => toShoppingCategory(i.category) === 'dairy').length,
    protein: items.filter((i) => toShoppingCategory(i.category) === 'protein').length,
    pantry:  items.filter((i) => toShoppingCategory(i.category) === 'pantry').length,
    other:   items.filter((i) => toShoppingCategory(i.category) === 'other').length,
  };

  const purchasedCount = items.filter((i) => i.purchased).length;

  // Filter by active tab
  const filteredItems =
    activeTab === 'all'
      ? items
      : items.filter((item) => toShoppingCategory(item.category) === activeTab);

  // Sort: unpurchased first, then newest first
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.purchased !== b.purchased) return a.purchased ? 1 : -1;
    return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
  });

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <section className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
            Shopping List
          </h1>
          <p className="mt-1 text-neutral-500">
            {items.length} {items.length === 1 ? 'item' : 'items'}
            {purchasedCount > 0 && ` \u00b7 ${purchasedCount} purchased`}
          </p>
        </div>

        {purchasedCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearCompleted}>
            Clear completed
          </Button>
        )}
      </section>

      {/* ── Add Item ── */}
      <form onSubmit={addItem} className="flex gap-3">
        <div className="flex-1">
          <Input
            placeholder="Add item\u2026"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            leftIcon={<PlusIcon />}
            fullWidth
          />
        </div>
        <Button type="submit" disabled={!inputValue.trim()}>
          Add
        </Button>
      </form>

      {/* ── Category Tabs ── */}
      <div
        className="flex gap-1.5 overflow-x-auto scrollbar-hidden pb-1"
        role="tablist"
        aria-label="Filter by category"
      >
        {categoryTabs.map((cat) => {
          const active = activeTab === cat.key;
          const count = categoryCounts[cat.key];
          return (
            <button
              key={cat.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(cat.key)}
              className={[
                'flex items-center gap-1.5',
                'px-3.5 py-2 rounded-lg',
                'text-sm font-medium whitespace-nowrap',
                'transition-all duration-200',
                'cursor-pointer',
                active
                  ? 'bg-brand-100 text-brand-700'
                  : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700',
              ].join(' ')}
            >
              {cat.label}
              {count > 0 && (
                <span
                  className={[
                    'inline-flex items-center justify-center',
                    'min-w-5 h-5 px-1.5 rounded-full',
                    'text-xs font-semibold',
                    active
                      ? 'bg-brand-200 text-brand-800'
                      : 'bg-neutral-200 text-neutral-600',
                  ].join(' ')}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Item List ── */}
      {sortedItems.length > 0 ? (
        <div className="space-y-2" role="tabpanel">
          {sortedItems.map((item) => (
            <ShoppingItemRow
              key={item.id}
              item={item}
              onToggle={togglePurchased}
              onDelete={deleteItem}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<CartIcon />}
          title="Your shopping list is empty"
          description="Add items above to start building your shopping list."
        />
      ) : (
        <EmptyState
          icon={<ListIcon />}
          title={`No items in ${categoryTabs.find((c) => c.key === activeTab)?.label ?? 'this category'}`}
          description="Try selecting a different category or add new items."
        />
      )}
    </div>
  );
}
