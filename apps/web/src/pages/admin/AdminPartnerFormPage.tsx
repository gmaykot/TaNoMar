import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/design-system/components/Button';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { adminPartnersQueryKey, useAdminPartners } from '@/features/partners/hooks/usePartners';
import {
  createAdminPartner,
  updateAdminPartner,
} from '@/features/partners/services/partnersService';
import {
  emptyPartnerInput,
  partnerCategories,
  partnerCategoryLabel,
  partnerToInput,
  type PartnerInput,
  type PartnerOffer,
} from '@/features/partners/types/partner';
import partnerStyles from '@/features/partners/components/partners.module.css';
import formStyles from '@/features/locations/components/spotForm.module.css';
import { PageHeader } from '@/pages/shared/PageHeader';
import { ApiError } from '@/shared/api/errors';
import { routes } from '@/shared/constants/routes';
import styles from '@/pages/shared/pages.module.css';

function emptyOffer(): PartnerOffer {
  return { title: '', description: null, priceLabel: null, endsAt: null };
}

export function AdminPartnerFormPage() {
  const { partnerSlug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const list = useAdminPartners();
  const editing = list.data?.find((item) => item.slug === partnerSlug);
  const isNew = !partnerSlug;
  const [form, setForm] = useState<PartnerInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const value = form ?? (editing ? partnerToInput(editing) : emptyPartnerInput());

  const save = useMutation({
    mutationFn: (input: PartnerInput) =>
      isNew ? createAdminPartner(input) : updateAdminPartner(partnerSlug, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminPartnersQueryKey });
      navigate(routes.adminPartners);
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : 'Não foi possível salvar o parceiro.');
    },
  });

  if (!isNew && list.isPending) {
    return <FeedbackState title="Abrindo o parceiro" description="Carregando o cadastro." busy />;
  }
  if (!isNew && list.isSuccess && !editing) {
    return (
      <FeedbackState title="Parceiro não encontrado" description="Esse cadastro não existe mais." />
    );
  }

  function patch<K extends keyof PartnerInput>(key: K, next: PartnerInput[K]) {
    setForm({ ...value, [key]: next });
  }

  function patchOffer(index: number, next: PartnerOffer) {
    setForm({
      ...value,
      offers: value.offers.map((offer, offerIndex) => (offerIndex === index ? next : offer)),
    });
  }

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} to={routes.adminPartners}>
        <ArrowLeft size={16} aria-hidden="true" />
        Parceiros
      </Link>
      <PageHeader
        eyebrow="Administração"
        title={isNew ? 'Novo parceiro' : `Editar ${editing?.name ?? 'parceiro'}`}
        description="A landing só aparece na vitrine se estiver publicada e a flag ShowPartners estiver ligada."
      />
      <form
        className={formStyles.form}
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          save.mutate(value);
        }}
      >
        <label className={formStyles.field}>
          <span>Nome</span>
          <input
            value={value.name}
            required
            onChange={(event) => patch('name', event.target.value)}
          />
        </label>
        <div className={formStyles.row}>
          <label className={formStyles.field}>
            <span>Categoria</span>
            <select
              value={value.category}
              onChange={(event) =>
                patch('category', event.target.value as PartnerInput['category'])
              }
            >
              {partnerCategories.map((category) => (
                <option key={category} value={category}>
                  {partnerCategoryLabel[category]}
                </option>
              ))}
            </select>
          </label>
          <label className={formStyles.field}>
            <span>Cidade</span>
            <input value={value.city} onChange={(event) => patch('city', event.target.value)} />
          </label>
        </div>
        <label className={formStyles.field}>
          <span>Frase curta</span>
          <input value={value.tagline} onChange={(event) => patch('tagline', event.target.value)} />
        </label>
        <label className={formStyles.field}>
          <span>Sobre</span>
          <textarea value={value.about} onChange={(event) => patch('about', event.target.value)} />
        </label>
        <div className={formStyles.row}>
          <label className={formStyles.field}>
            <span>WhatsApp</span>
            <input
              value={value.whatsApp}
              inputMode="tel"
              placeholder="48999999999"
              onChange={(event) => patch('whatsApp', event.target.value)}
            />
          </label>
          <label className={formStyles.field}>
            <span>Instagram</span>
            <input
              value={value.instagram}
              placeholder="usuario"
              onChange={(event) => patch('instagram', event.target.value)}
            />
          </label>
        </div>
        <div className={formStyles.row}>
          <label className={formStyles.field}>
            <span>Site</span>
            <input
              value={value.website}
              onChange={(event) => patch('website', event.target.value)}
            />
          </label>
          <label className={formStyles.field}>
            <span>Maps</span>
            <input
              value={value.mapsUrl}
              onChange={(event) => patch('mapsUrl', event.target.value)}
            />
          </label>
        </div>
        <label className={formStyles.field}>
          <span>Imagem (URL)</span>
          <input
            value={value.coverImageUrl}
            onChange={(event) => patch('coverImageUrl', event.target.value)}
          />
        </label>
        <label className={formStyles.choice}>
          <input
            type="checkbox"
            checked={value.isPublished}
            onChange={(event) => patch('isPublished', event.target.checked)}
          />
          <span>Publicado na vitrine</span>
        </label>
        <label className={formStyles.choice}>
          <input
            type="checkbox"
            checked={value.isFeatured}
            onChange={(event) => patch('isFeatured', event.target.checked)}
          />
          <span>Destaque no diretório</span>
        </label>
        <div>
          <p className={formStyles.field}>
            <span>Ofertas e promoções</span>
          </p>
          {value.offers.map((offer, index) => (
            <div key={index} className={partnerStyles.offerRow}>
              <label className={formStyles.field}>
                <span>Título</span>
                <input
                  value={offer.title}
                  onChange={(event) => patchOffer(index, { ...offer, title: event.target.value })}
                />
              </label>
              <label className={formStyles.field}>
                <span>Valor (texto)</span>
                <input
                  value={offer.priceLabel ?? ''}
                  onChange={(event) =>
                    patchOffer(index, { ...offer, priceLabel: event.target.value || null })
                  }
                />
              </label>
              <label className={formStyles.field}>
                <span>Descrição</span>
                <textarea
                  value={offer.description ?? ''}
                  onChange={(event) =>
                    patchOffer(index, { ...offer, description: event.target.value || null })
                  }
                />
              </label>
              <label className={formStyles.field}>
                <span>Válida até (opcional)</span>
                <input
                  type="datetime-local"
                  value={offer.endsAt ? offer.endsAt.slice(0, 16) : ''}
                  onChange={(event) =>
                    patchOffer(index, {
                      ...offer,
                      endsAt: event.target.value
                        ? new Date(event.target.value).toISOString()
                        : null,
                    })
                  }
                />
              </label>
              <Button
                type="button"
                variant="quiet"
                onClick={() =>
                  setForm({
                    ...value,
                    offers: value.offers.filter((_, offerIndex) => offerIndex !== index),
                  })
                }
              >
                Remover oferta
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() => patch('offers', [...value.offers, emptyOffer()])}
          >
            Adicionar oferta
          </Button>
        </div>
        {error ? <p className={formStyles.error}>{error}</p> : null}
        <div className={formStyles.actions}>
          <Button type="submit" disabled={save.isPending}>
            Salvar
          </Button>
        </div>
      </form>
    </div>
  );
}
