import { AlertTriangle, CloudSun, Fish, MapPinned, Users } from 'lucide-react';
import { Card } from '@/design-system/components/Card';
import { PageHeader } from '@/pages/shared/PageHeader';
import aboutStyles from './about.module.css';
import styles from '@/pages/shared/pages.module.css';

export function AboutPage() {
  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Sobre"
        title="De onde vêm as informações."
        description="Clima, nota de pesca, locais e relatos — cada um com a origem certa."
      />
      <Card as="section" className={aboutStyles.source}>
        <h2>
          <CloudSun size={18} aria-hidden="true" /> Clima e mar
        </h2>
        <p>
          Vento, chuva, temperatura do ar, ondas, swell e temperatura da água vêm do Open-Meteo, que
          combina previsão do tempo, o modelo GFS e dados marinhos.
        </p>
        <a
          className={aboutStyles.attribution}
          href="https://open-meteo.com/"
          rel="noreferrer"
          target="_blank"
        >
          Weather data by Open-Meteo.com
        </a>
      </Card>
      <Card as="section" className={aboutStyles.source}>
        <h2>
          <Fish size={18} aria-hidden="true" /> Nota de pesca
        </h2>
        <p>
          A nota de 0 a 10 e a classificação saem da API do TáNoMar, a partir dessas métricas e do
          perfil do local. O aplicativo não recalcula a nota no celular.
        </p>
      </Card>
      <Card as="section" className={aboutStyles.source}>
        <h2>
          <MapPinned size={18} aria-hidden="true" /> Locais
        </h2>
        <ul>
          <li>Praias oficiais são cadastradas pelo TáNoMar.</li>
          <li>Pesqueiros pessoais e compartilhados vêm dos próprios pescadores.</li>
        </ul>
      </Card>
      <Card as="section" className={aboutStyles.source}>
        <h2>
          <Users size={18} aria-hidden="true" /> Comunidade
        </h2>
        <p>
          Relatos de condição duram 12 horas. Relatos de perigo duram 24 horas. Dá para enviar com
          um toque — deu peixe, mar bom, mar ruim ou perigo — ou escrever o que você viu. Quem
          confirma ou contesta também é outro pescador no app. Quem favoritou o local recebe um
          aviso na caixa do sino. O autor pode apagar o próprio relato.
        </p>
      </Card>
      <Card as="section" className={aboutStyles.notice}>
        <h2>
          <AlertTriangle size={18} aria-hidden="true" /> Aviso
        </h2>
        <p>
          A previsão pode mudar. Olhe o mar no local antes de entrar — o TáNoMar não substitui o que
          você vê na praia.
        </p>
      </Card>
    </div>
  );
}
