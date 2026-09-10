import { ArrowRight } from 'lucide-react';
import { homeCopy } from '@/features/auth/appFocus';
import { DateSelector } from '@/features/forecast/components/DateSelector';
import { ForecastPresentation } from '@/features/forecast/components/ForecastPresentation';
import { RankingList } from '@/features/ranking/components/RankingList';
import { PageHeader } from '@/pages/shared/PageHeader';
import pageStyles from '@/pages/shared/pages.module.css';
import { LandingAppFrame } from './LandingAppFrame';
import {
  landingPreviewDate,
  landingPreviewDayLabel,
  landingPreviewDays,
  landingPreviewRanking,
} from './landingPreviewData';
import styles from './landingPreview.module.css';

const home = homeCopy(null, landingPreviewDayLabel);

export function ProductPreview() {
  const best = landingPreviewRanking[0];
  if (!best) return null;

  return (
    <LandingAppFrame active="inicio" label="Demonstração da Home com dados ilustrativos">
      <div className={`${pageStyles.page} ${styles.appFramePage}`}>
        <PageHeader eyebrow={home.eyebrow} title={home.title} description={home.description} />
        <DateSelector
          days={landingPreviewDays}
          selectedDate={landingPreviewDate}
          onSelect={() => undefined}
        />
        <ForecastPresentation
          variant="summary"
          forecast={best}
          date={landingPreviewDate}
          dayLabel={landingPreviewDayLabel}
        />
        <section className={pageStyles.section}>
          <div className={pageStyles.sectionHeader}>
            <div>
              <span>Outras boas escolhas</span>
              <h2>Ranking do dia</h2>
            </div>
            <span className={styles.appFrameGhostLink}>
              Ver todos <ArrowRight size={17} aria-hidden="true" />
            </span>
          </div>
          <RankingList items={landingPreviewRanking.slice(1)} limit={2} startAt={2} />
        </section>
      </div>
    </LandingAppFrame>
  );
}
