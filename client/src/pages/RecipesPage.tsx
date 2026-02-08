import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Recipe, RecipeDifficulty } from '../types';
import RecipeCard from '../components/features/Recipes/RecipeCard';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Alert from '../components/ui/Alert';

/* ---- Types ---- */

type PageStatus = 'empty' | 'loading' | 'loaded' | 'error';
type DifficultyFilter = RecipeDifficulty | 'all';

const USER_ID = 'demo_user';

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

function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2" />
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
  const navigate = useNavigate();
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

  /* ---- Generate recipes ---- */

  const handleGenerate = useCallback(async () => {
    setStatus('loading');
    setError('');
    let mapped: Recipe[] = [];
    let failed = false;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);

      const res = await fetch(
        `/api/recipes/${USER_ID}?days=7`,
        { signal: controller.signal },
      );
      clearTimeout(timeout);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.detail || data.message || `Server error ${res.status}`,
        );
      }

      const rawRecipes = data.recipes ?? [];
      mapped = rawRecipes.map(
        (raw: { name: string; prep_time: string; ingredients: string[]; instructions: string[]; items_used: string[] }, i: number): Recipe => ({
          id: `generated-${i}`,
          name: raw.name,
          prep_time_minutes: parseInt(raw.prep_time, 10) || 0,
          ingredients: (raw.ingredients ?? []).map((name: string) => ({
            name,
            amount: 1,
            in_inventory: true,
          })),
          instructions: raw.instructions ?? [],
          uses_expiring_items: raw.items_used ?? [],
        }),
      );
    } catch (err) {
      failed = true;
      const msg =
        err instanceof DOMException && err.name === 'AbortError'
          ? 'Request timed out. Is the backend running?'
          : err instanceof Error
            ? err.message
            : 'Something went wrong.';
      setError(msg);
      console.error('[RecipesPage] generate failed:', err);
    } finally {
      // Guarantee we ALWAYS exit loading — no matter what happened above
      setRecipes(mapped);
      setStatus(failed ? 'error' : 'loaded');
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

      {/* Loaded — no recipes returned from API */}
      {status === 'loaded' && recipes.length === 0 && (
        <EmptyState
          icon={<BookOpenIcon />}
          title="Your fridge is empty!"
          description="Scan some food to get recipes. We'll generate meal ideas based on what's in your fridge."
          action={
            <Button
              variant="primary"
              size="md"
              leftIcon={<CameraIcon />}
              onClick={() => navigate('/scan')}
            >
              Scan Your Fridge
            </Button>
          }
        />
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
