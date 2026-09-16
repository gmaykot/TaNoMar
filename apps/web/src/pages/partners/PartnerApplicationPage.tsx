import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/design-system/components/Button';
import { createPartnerApplication } from '@/features/partners/services/partnersService';
import {
  partnerCategories,
  partnerCategoryLabel,
  type PartnerApplicationInput,
} from '@/features/partners/types/partner';
import formStyles from '@/features/locations/components/spotForm.module.css';
import { PageHeader } from '@/pages/shared/PageHeader';
import { ApiError } from '@/shared/api/errors';
import { routes } from '@/shared/constants/routes';
import styles from '@/pages/shared/pages.module.css';

const emptyApplication: PartnerApplicationInput = {
  name: '',
  category: 'loja',
  city: '',
  whatsApp: '',
};

export function PartnerApplicationPage() {
  const [form, setForm] = useState(emptyApplication);
  const [error, setError] = useState<string | null>(null);
  const application = useMutation({
    mutationFn: createPartnerApplication,
    onError: (cause) => {
      setError(
        cause instanceof ApiError ? cause.message : 'Não foi possível enviar a solicitação.',
      );
    },
  });

  function patch<K extends keyof PartnerApplicationInput>(
    key: K,
    value: PartnerApplicationInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  if (application.isSuccess) {
    return (
      <div className={styles.page}>
        <PageHeader
          eyebrow="Parcerias"
          title="Solicitação enviada"
          description="Seu cadastro ficou aguardando análise. Entraremos em contato pelo WhatsApp informado."
        />
        <div className={formStyles.card} role="status">
          <CheckCircle2 size={32} aria-hidden="true" />
          <h2>Obrigado pelo interesse no TáNoMar</h2>
          <p>O parceiro ainda não aparece na vitrine e será avaliado antes da publicação.</p>
          <div className={formStyles.actions}>
            <Link to={routes.home}>Voltar para a Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Parcerias"
        title="Seja um parceiro"
        description="Conte o essencial sobre seu negócio. Nossa equipe analisará os dados e fará contato pelo WhatsApp."
      />
      <form
        className={formStyles.card}
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          application.mutate(form);
        }}
      >
        <label className={formStyles.field}>
          <span>Nome do negócio</span>
          <input
            required
            maxLength={120}
            value={form.name}
            onChange={(event) => patch('name', event.target.value)}
          />
        </label>
        <label className={formStyles.field}>
          <span>Categoria</span>
          <select
            value={form.category}
            onChange={(event) =>
              patch('category', event.target.value as PartnerApplicationInput['category'])
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
          <input
            required
            maxLength={100}
            value={form.city}
            onChange={(event) => patch('city', event.target.value)}
          />
        </label>
        <label className={formStyles.field}>
          <span>WhatsApp com DDD</span>
          <input
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="48999999999"
            value={form.whatsApp}
            onChange={(event) => patch('whatsApp', event.target.value)}
          />
        </label>
        <p>
          O envio não publica o parceiro automaticamente. A ativação é feita pelo administrador após
          a análise.
        </p>
        {error ? (
          <p className={formStyles.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={formStyles.actions}>
          <Button type="submit" disabled={application.isPending}>
            {application.isPending ? 'Enviando...' : 'Enviar solicitação'}
          </Button>
        </div>
      </form>
    </div>
  );
}
