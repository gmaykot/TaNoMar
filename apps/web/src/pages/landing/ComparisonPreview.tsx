import { rankingCopy } from '@/features/auth/appFocus';
import { DateSelector } from '@/features/forecast/components/DateSelector';
import { RankingList } from '@/features/ranking/components/RankingList';
import { PageHeader } from '@/pages/shared/PageHeader';
import pageStyles from '@/pages/shared/pages.module.css';
import { LandingAppFrame } from './LandingAppFrame';
import {
  landingPreviewDate,
  landingPreviewDays,
  landingPreviewRanking,
} from './landingPreviewData';
import styles from './landingPreview.module.css';

const ranking = rankingCopy(null);

export function ComparisonPreview() {
  return (
    <LandingAppFrame active="ranking" label="Demonstração do ranking com dados ilustrativos">
      <div className={`${pageStyles.page} ${styles.appFramePage}`}>
        <PageHeader
          eyebrow={ranking.eyebrow}
          title={ranking.title}
          description={ranking.description}
        />
        <DateSelector
          days={landingPreviewDays}
          selectedDate={landingPreviewDate}
          onSelect={() => undefined}
        />
        <RankingList items={landingPreviewRanking} />
      </div>
    </LandingAppFrame>
  );
}
