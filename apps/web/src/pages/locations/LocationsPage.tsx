import { Lock, MapPinned } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/design-system/components/Button';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { SearchField } from '@/design-system/components/SearchField';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { LocationCard } from '@/features/locations/components/LocationCard';
import { useLocationMutations } from '@/features/locations/hooks/useLocationMutations';
import { useLocations } from '@/features/locations/hooks/useLocations';
import { PageHeader } from '@/pages/shared/PageHeader';
import { routes } from '@/shared/constants/routes';
import { normalizeText } from '@/shared/utils/normalizeText';
import styles from '@/pages/shared/pages.module.css';

type Filter = 'all' | 'mine' | 'favorites';

function parseFilter(value: string | null, canCreate: boolean, canFavorite: boolean): Filter {
  if (value === 'meus' && canCreate) return 'mine';
  if (value === 'favoritos' && canFavorite) return 'favorites';
  return 'all';
}

export function LocationsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const locations = useLocations();
  const mutations = useLocationMutations();
  const [search, setSearch] = useState('');
  const canCreate = (auth.user?.entitlements.maxPersonalSpots ?? 0) > 0;
  const canFavorite = (auth.user?.entitlements.maxFavorites ?? 0) > 0;
  const filter = parseFilter(searchParams.get('filtro'), canCreate, canFavorite);

  function setFilter(next: Filter) {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        if (next === 'mine') params.set('filtro', 'meus');
        else if (next === 'favorites') params.set('filtro', 'favoritos');
        else params.delete('filtro');
        return params;
      },
      { replace: true },
    );
  }

  const filtered = useMemo(() => {
    if (!locations.data) return [];
    const term = normalizeText(search.trim());
    return locations.data.filter((location) => {
      if (filter === 'mine' && !location.isOwner) return false;
      if (filter === 'favorites' && !location.isFavorite) return false;
      if (!term) return true;
      return normalizeText(`${location.name} ${location.city} ${location.region}`).includes(term);
    });
  }, [filter, locations.data, search]);

  if (locations.isPending)
    return (
      <FeedbackState
        title="Abrindo o mapa"
        description="Carregando os locais de pesca."
        icon={MapPinned}
        busy
      />
    );
  if (locations.isError)
    return (
      <FeedbackState
        title="Locais indisponíveis"
        description="Não foi possível carregar os locais."
      />
    );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Seu próximo destino"
        title="Encontre um lugar para pescar."
        description="Oficiais, favoritos e locais pessoais."
      />
      <SearchField
        label="Buscar locais"
        placeholder="Busque por local ou região"
        value={search}
        onChange={setSearch}
      />
      <div className={styles.filters} role="group" aria-label="Filtrar locais">
        {(
          [
            ['all', 'Todos', false],
            ['mine', 'Meus locais', !canCreate],
            ['favorites', 'Favoritos', !canFavorite],
          ] as const
        ).map(([id, label, locked]) => (
          <button
            key={id}
            type="button"
            className={`${styles.filter} ${filter === id ? styles.filterActive : ''}`}
            aria-pressed={filter === id}
            aria-label={locked ? `${label}, disponível no Premium` : undefined}
            disabled={locked}
            onClick={locked ? undefined : () => setFilter(id)}
          >
            {locked ? <Lock size={14} aria-hidden="true" /> : null}
            {label}
          </button>
        ))}
      </div>
      {mutations.favoriteError ? <p>{mutations.favoriteError}</p> : null}
      <div className={styles.resultCount}>
        {filtered.length} {filtered.length === 1 ? 'local encontrado' : 'locais encontrados'}
      </div>
      {filter === 'mine' ? (
        <Button type="button" onClick={() => navigate(routes.locationNew)}>
          Novo local
        </Button>
      ) : null}
      {filtered.length ? (
        <div className={styles.locationGrid}>
          {filtered.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              favoriteLocked={!canFavorite}
              onToggleFavorite={() => {
                if (!canFavorite && !location.isFavorite) return;
                mutations.favorite.mutate({
                  spotId: location.id,
                  isFavorite: !location.isFavorite,
                });
              }}
            />
          ))}
        </div>
      ) : (
        <FeedbackState
          title="Nenhum local encontrado"
          description="Tente buscar por outro nome ou região."
        />
      )}
    </div>
  );
}
