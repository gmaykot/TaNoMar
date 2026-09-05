import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forecastFixture } from '@/features/forecast/fixtures/forecast';
import { DateSelector } from './DateSelector';

describe('DateSelector', () => {
  it('seleciona o dia ao tocar no chip', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <DateSelector
        days={forecastFixture.days}
        selectedDate={forecastFixture.days[0]!.date}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Amanhã/ }));
    expect(onSelect).toHaveBeenCalledWith(forecastFixture.days[1]!.date);
  });

  it('avança o dia com as setas no carrossel', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <DateSelector
        days={forecastFixture.days}
        selectedDate={forecastFixture.days[0]!.date}
        onSelect={onSelect}
        variant="carousel"
      />,
    );

    screen.getByRole('button', { name: /Hoje/ }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onSelect).toHaveBeenCalledWith(forecastFixture.days[1]!.date);
  });
});
