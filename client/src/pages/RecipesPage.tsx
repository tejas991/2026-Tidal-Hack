import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Recipe, RecipeDifficulty } from '../types';
import RecipeCard from '../components/features/Recipes/RecipeCard';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Alert from '../components/ui/Alert';

/* ---- Types ---- */

type PageStatus = 'empty' | 'loading' | 'loaded' | 'error';
type DifficultyFilter = RecipeDifficulty | 'all';

/* ---- Mock recipes ---- */

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const MOCK_RECIPES: Recipe[] = [
  {
    id: 'r1',
    name: 'Greek Yogurt Parfait',
    description:
      'Layer creamy yogurt with fresh fruits and crunchy granola for a quick, nutritious breakfast.',
    prep_time_minutes: 10,
    servings: 2,
    difficulty: 'easy',
    uses_expiring_items: ['Greek yogurt'],
    ingredients: [
      { name: 'Greek yogurt', amount: 1, unit: 'cup', in_inventory: true },
      { name: 'Granola', amount: 0.5, unit: 'cup', in_inventory: false },
      { name: 'Mixed berries', amount: 1, unit: 'cup', in_inventory: false },
      { name: 'Honey', amount: 1, unit: 'tbsp', in_inventory: false },
    ],
    instructions: [
      'Spoon half the yogurt into two glasses or bowls.',
      'Add a layer of granola and berries.',
      'Top with remaining yogurt, more granola, and a drizzle of honey.',
      'Serve immediately or refrigerate up to 4 hours.',
    ],
  },
  {
    id: 'r2',
    name: 'Chicken Stir-Fry with Bell Peppers',
    description:
      'A fast weeknight dinner that puts your expiring chicken and veggies to great use.',
    prep_time_minutes: 25,
    servings: 4,
    difficulty: 'medium',
    uses_expiring_items: ['Chicken breast', 'Bell peppers'],
    ingredients: [
      { name: 'Chicken breast', amount: 2, unit: 'pieces', in_inventory: true },
      { name: 'Bell peppers', amount: 2, unit: 'pieces', in_inventory: true },
      { name: 'Soy sauce', amount: 3, unit: 'tbsp', in_inventory: false },
      { name: 'Garlic', amount: 3, unit: 'cloves', in_inventory: false },
      { name: 'Ginger', amount: 1, unit: 'tbsp', in_inventory: false },
      { name: 'Rice', amount: 2, unit: 'cups', in_inventory: false },
    ],
    instructions: [
      'Slice chicken into thin strips and season with salt and pepper.',
      'Heat oil in a wok or large skillet over high heat.',
      'Cook chicken strips 4-5 minutes until golden. Remove and set aside.',
      'Add sliced bell peppers and stir-fry 2-3 minutes.',
      'Return chicken to the pan, add soy sauce, garlic, and ginger.',
      'Toss everything together for 1-2 minutes. Serve over steamed rice.',
    ],
  },
  {
    id: 'r3',
    name: 'Spinach & Cheese Omelette',
    description:
      'A protein-packed breakfast ready in under 15 minutes using your expiring spinach and cheese.',
    prep_time_minutes: 12,
    servings: 1,
    difficulty: 'easy',
    uses_expiring_items: ['Baby spinach', 'Cheddar cheese', 'Eggs'],
    ingredients: [
      { name: 'Eggs', amount: 3, in_inventory: true },
      { name: 'Baby spinach', amount: 1, unit: 'cup', in_inventory: true },
      { name: 'Cheddar cheese', amount: 0.5, unit: 'cup', in_inventory: true },
      { name: 'Butter', amount: 1, unit: 'tbsp', in_inventory: false },
      { name: 'Salt & pepper', amount: 1, unit: 'pinch', in_inventory: false },
    ],
    instructions: [
      'Whisk eggs with a pinch of salt and pepper.',
      'Melt butter in a non-stick pan over medium heat.',
      'Pour in eggs and let set for 1 minute without stirring.',
      'Add spinach and cheese on one half.',
      'Fold the other half over and cook 1-2 minutes until cheese melts.',
      'Slide onto a plate and serve.',
    ],
  },
  {
    id: 'r4',
    name: 'Milk-Braised Chicken Thighs',
    description:
      'Tender chicken simmered in milk with garlic and herbs — a cozy, surprising dish.',
    prep_time_minutes: 55,
    servings: 4,
    difficulty: 'hard',
    uses_expiring_items: ['Milk', 'Chicken breast'],
    ingredients: [
      { name: 'Chicken thighs', amount: 4, unit: 'pieces', in_inventory: true },
      { name: 'Milk', amount: 2, unit: 'cups', in_inventory: true },
      { name: 'Garlic', amount: 6, unit: 'cloves', in_inventory: false },
      { name: 'Fresh sage', amount: 8, unit: 'leaves', in_inventory: false },
      { name: 'Lemon zest', amount: 1, unit: 'tsp', in_inventory: false },
      { name: 'Olive oil', amount: 2, unit: 'tbsp', in_inventory: false },
    ],
    instructions: [
      'Season chicken thighs generously with salt and pepper.',
      'Sear skin-side down in olive oil for 5 minutes until golden.',
      'Flip chicken, add garlic cloves, sage leaves, and lemon zest.',
      'Pour in milk — it should come halfway up the chicken.',
      'Bring to a gentle simmer, cover, and cook 35-40 minutes.',
      'Remove lid for the last 10 minutes to let the sauce reduce and thicken.',
      'Serve with crusty bread to soak up the sauce.',
    ],
  },
  {
    id: 'r5',
    name: 'Quick Veggie Fried Rice',
    description:
      'Turn leftover rice and whatever veggies you have into a satisfying one-pan meal.',
    prep_time_minutes: 15,
    servings: 3,
    difficulty: 'easy',
    uses_expiring_items: ['Bell peppers', 'Eggs'],
    ingredients: [
      { name: 'Cooked rice', amount: 3, unit: 'cups', in_inventory: false },
      { name: 'Bell peppers', amount: 1, unit: 'piece', in_inventory: true },
      { name: 'Eggs', amount: 2, in_inventory: true },
      { name: 'Soy sauce', amount: 2, unit: 'tbsp', in_inventory: false },
      { name: 'Sesame oil', amount: 1, unit: 'tsp', in_inventory: false },
      { name: 'Green onions', amount: 3, unit: 'stalks', in_inventory: false },
    ],
    instructions: [
      'Heat oil in a large skillet or wok over high heat.',
      'Scramble eggs, break into pieces, and set aside.',
      'Stir-fry diced bell peppers for 2 minutes.',
      'Add cold rice and toss until heated through and slightly crispy.',
      'Add scrambled eggs back, drizzle with soy sauce and sesame oil.',
      'Top with sliced green onions and serve hot.',
    ],
  },
];

/* ---- Simulated API ---- */

async function generateRecipes(): Promise<Recipe[]> {
  // Simulate network delay (1.5–2.5 s)
  const delay = 1500 + Math.random() * 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Randomly fail ~10% of the time to demo error state
  if (Math.random() < 0.1) {
    throw new Error('Failed to generate recipes. Please try again.');
  }

  // Return 3–5 random recipes
  const shuffled = [...MOCK_RECIPES].sort(() => Math.random() - 0.5);
  const count = 3 + Math.floor(Math.random() * 3); // 3–5
  return shuffled.slice(0, count);
}

/* ---- Icons ---- */

function SparkleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.937A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"
        fill="currentColor"
      />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M23 4v6h-6M1 20v-6h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BookOpenIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2V3ZM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7V3Z"
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 6 9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---- Skeleton card ---- */

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 animate-pulse">
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <div className="h-5 w-3/5 rounded bg-neutral-200" />
        <div className="h-5 w-14 rounded-full bg-neutral-200" />
      </div>
      {/* Description */}
      <div className="mt-3 space-y-2">
        <div className="h-3.5 w-full rounded bg-neutral-100" />
        <div className="h-3.5 w-4/5 rounded bg-neutral-100" />
      </div>
      {/* Metadata */}
      <div className="mt-4 flex gap-4">
        <div className="h-4 w-16 rounded bg-neutral-100" />
        <div className="h-4 w-20 rounded bg-neutral-100" />
      </div>
      {/* Ingredients */}
      <div className="mt-5 space-y-2.5">
        <div className="h-3 w-20 rounded bg-neutral-200" />
        <div className="h-3.5 w-full rounded bg-neutral-100" />
        <div className="h-3.5 w-5/6 rounded bg-neutral-100" />
        <div className="h-3.5 w-3/4 rounded bg-neutral-100" />
      </div>
      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-neutral-100 flex gap-3">
        <div className="h-8 w-24 rounded-lg bg-neutral-200" />
        <div className="h-8 w-20 rounded-lg bg-neutral-200" />
      </div>
    </div>
  );
}

/* ---- Toast ---- */

interface ToastState {
  visible: boolean;
  recipeName: string;
}

function Toast({
  recipeName,
  onClose,
}: {
  recipeName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={[
        'fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-2.5 px-5 py-3',
        'rounded-xl bg-neutral-900 text-white',
        'shadow-strong',
        'animate-[slideUp_300ms_ease-out]',
      ].join(' ')}
      role="status"
    >
      <span className="text-success-light shrink-0">
        <CheckIcon />
      </span>
      <span className="text-sm font-medium">
        Marked &ldquo;{recipeName}&rdquo; as cooked!
      </span>
    </div>
  );
}

/* ---- Component ---- */

export default function RecipesPage() {
  const [status, setStatus] = useState<PageStatus>('empty');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    recipeName: '',
  });

  // Filters
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ---- Generate recipes ---- */

  const handleGenerate = useCallback(async () => {
    setStatus('loading');
    setError('');

    try {
      const result = await generateRecipes();
      if (!mountedRef.current) return;
      setRecipes(result);
      setStatus('loaded');
    } catch (err) {
      if (!mountedRef.current) return;
      setError(
        err instanceof Error ? err.message : 'Something went wrong.',
      );
      setStatus('error');
    }
  }, []);

  /* ---- Cook handler ---- */

  const handleCook = useCallback((recipe: Recipe) => {
    setToast({ visible: true, recipeName: recipe.name });
  }, []);

  const dismissToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  /* ---- Filtered recipes (memoized) ---- */

  const filtered = useMemo(
    () =>
      recipes.filter((r) => {
        if (expiringOnly && r.uses_expiring_items.length === 0) return false;
        if (difficulty !== 'all' && r.difficulty !== difficulty) return false;
        return true;
      }),
    [recipes, expiringOnly, difficulty],
  );

  const showFilters = status === 'loaded' && recipes.length > 0;

  /* ---- Render ---- */

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* ── Header ── */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
            Recipes to Save Your Food
          </h1>
          <p className="mt-1 text-neutral-500">
            AI-generated meals using what&apos;s already in your fridge.
          </p>
        </div>
        {/* Desktop generate button */}
        <Button
          variant="primary"
          size="md"
          leftIcon={<SparkleIcon />}
          isLoading={status === 'loading'}
          onClick={handleGenerate}
          className="hidden md:inline-flex"
        >
          {recipes.length > 0 ? 'Refresh Recipes' : 'Get New Recipes'}
        </Button>
      </section>

      {/* ── Filters ── */}
      {showFilters && (
        <section
          className={[
            'flex flex-col md:flex-row md:items-center gap-4',
            'rounded-xl border border-neutral-200 bg-white',
            'p-4',
          ].join(' ')}
        >
          <div className="flex items-center gap-2.5 text-neutral-500">
            <FilterIcon />
            <span className="text-sm font-medium text-neutral-700">
              Filters
            </span>
          </div>

          {/* Expiring toggle */}
          <label
            className={[
              'inline-flex items-center gap-2.5 cursor-pointer',
              'select-none',
            ].join(' ')}
          >
            <button
              type="button"
              role="switch"
              aria-checked={expiringOnly}
              onClick={() => setExpiringOnly((prev) => !prev)}
              className={[
                'relative inline-flex h-6 w-11 shrink-0',
                'rounded-full border-2 border-transparent',
                'transition-colors duration-200 ease-in-out',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
                'cursor-pointer',
                expiringOnly ? 'bg-brand-600' : 'bg-neutral-300',
              ].join(' ')}
            >
              <span
                aria-hidden="true"
                className={[
                  'pointer-events-none inline-block h-5 w-5',
                  'rounded-full bg-white shadow-sm',
                  'transform transition-transform duration-200 ease-in-out',
                  expiringOnly ? 'translate-x-5' : 'translate-x-0',
                ].join(' ')}
              />
            </button>
            <span className="text-sm text-neutral-700">
              Only recipes using expiring items
            </span>
          </label>

          {/* Difficulty dropdown */}
          <div className="flex items-center gap-2 md:ml-auto">
            <span className="text-sm text-neutral-500">Difficulty:</span>
            <select
              value={difficulty}
              onChange={(e) =>
                setDifficulty(e.target.value as DifficultyFilter)
              }
              className={[
                'rounded-lg border border-neutral-200 bg-white',
                'px-3 py-1.5 text-sm text-neutral-700',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
                'cursor-pointer',
              ].join(' ')}
            >
              <option value="all">All</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </section>
      )}

      {/* ── Result count ── */}
      {showFilters && (
        <p className="text-sm text-neutral-500">
          Showing{' '}
          <span className="font-semibold text-neutral-900">
            {filtered.length}
          </span>{' '}
          {filtered.length === 1 ? 'recipe' : 'recipes'}
          {(expiringOnly || difficulty !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setExpiringOnly(false);
                setDifficulty('all');
              }}
              className="ml-2 text-brand-600 hover:text-brand-700 font-medium cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </p>
      )}

      {/* ── Content ── */}

      {/* Empty state */}
      {status === 'empty' && (
        <EmptyState
          icon={<BookOpenIcon />}
          title="No recipes yet"
          description='Click "Get New Recipes" to generate meal ideas based on your fridge inventory.'
          action={
            <Button
              variant="primary"
              size="md"
              leftIcon={<SparkleIcon />}
              onClick={handleGenerate}
            >
              Get New Recipes
            </Button>
          }
        />
      )}

      {/* Loading skeletons */}
      {status === 'loading' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="max-w-lg mx-auto space-y-4">
          <Alert variant="danger" title="Recipe generation failed">
            {error}
          </Alert>
          <div className="flex justify-center">
            <Button
              variant="primary"
              size="md"
              leftIcon={<RefreshIcon />}
              onClick={handleGenerate}
            >
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Loaded — recipe grid */}
      {status === 'loaded' && filtered.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onSelectRecipe={handleCook}
            />
          ))}
        </div>
      )}

      {/* Loaded — no matches after filtering */}
      {status === 'loaded' && filtered.length === 0 && recipes.length > 0 && (
        <EmptyState
          icon={<FilterIcon />}
          title="No matching recipes"
          description="Try adjusting your filters to see more results."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setExpiringOnly(false);
                setDifficulty('all');
              }}
            >
              Clear Filters
            </Button>
          }
        />
      )}

      {/* ── Fixed bottom generate button — mobile only ── */}
      <div
        className={[
          'fixed bottom-16 inset-x-0 z-30',
          'px-4 pb-3 pt-4',
          'bg-gradient-to-t from-neutral-50 via-neutral-50/95 to-transparent',
          'md:hidden',
        ].join(' ')}
      >
        <Button
          variant="primary"
          size="lg"
          leftIcon={<SparkleIcon />}
          isLoading={status === 'loading'}
          onClick={handleGenerate}
          fullWidth
          className="min-h-[44px] shadow-medium"
        >
          {recipes.length > 0 ? 'Refresh Recipes' : 'Get New Recipes'}
        </Button>
      </div>

      {/* ── Toast ── */}
      {toast.visible && (
        <Toast recipeName={toast.recipeName} onClose={dismissToast} />
      )}
    </div>
  );
}
