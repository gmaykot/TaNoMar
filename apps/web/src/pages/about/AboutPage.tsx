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
        description="Clima, nota, locais e relatos."
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
          A nota vai de 0 a 10 e só a API calcula. Cada hora do dia recebe uma nota; a nota do local
          é a média das 3 melhores horas entre 5h e 20h. O aplicativo não refaz essa conta no
          celular.
        </p>
        <p>A nota de cada hora soma estes fatores:</p>
        <ul>
          <li>Vento — 25%. Vento fraco a moderado ajuda; acima de 30 km/h a nota cai forte.</li>
          <li>
            Direção do vento — 25%. Vento de terra (offshore) vale mais. Vento do mar (onshore)
            empurra a nota para baixo, usando a orientação da praia.
          </li>
          <li>
            Altura da onda — 20%. O que é “bom” muda com o perfil: praia protegida prefere onda
            menor; praia aberta aceita um pouco mais.
          </li>
          <li>Período da onda — 10%. O intervalo ideal fica entre 6 e 10 segundos.</li>
          <li>Chance de chuva — 10%. Pouca chuva ajuda; temporal puxa a nota para baixo.</li>
          <li>Horário — 10%. Amanhecer e entardecer valem mais que o meio do dia.</li>
        </ul>
        <p>
          Depois entram os cortes: rajada forte, volume de chuva, vento extremo com rajada e onda
          acima de 2,2 m. A chuva usa o pior entre dois modelos do Open-Meteo, para não suavizar um
          temporal. Maré, swell e temperatura da água aparecem no detalhe, mas não entram na nota.
        </p>
        <p>A classificação sai dessa nota:</p>
        <ul>
          <li>8,5 ou mais — Excelente</li>
          <li>7,0 a 8,4 — Muito bom</li>
          <li>5,0 a 6,9 — Regular</li>
          <li>Abaixo de 5,0 — Difícil</li>
        </ul>
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
          Relatos de condição duram 12 horas. Relatos de perigo duram 24 horas. Qualquer pescador no
          app vê e relata — com um toque (deu peixe, mar bom, mar ruim ou perigo) ou escrevendo o
          que viu. Confirmar ou contestar é Premium. Quem favoritou o local recebe um aviso na caixa
          do sino. O autor pode apagar o próprio relato.
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
