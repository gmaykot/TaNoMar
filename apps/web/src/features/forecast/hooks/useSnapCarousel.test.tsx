import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DayCarousel } from '@/features/forecast/components/DayCarousel';

describe('useSnapCarousel', () => {
  it('preserva o clique em links dentro do carrossel', () => {
    const onSelect = vi.fn();
    const onClick = vi.fn();

    render(
      <MemoryRouter>
        <DayCarousel
          days={[{ date: '2026-09-09', label: 'Hoje', shortLabel: 'Qua 09' }]}
          selectedDate="2026-09-09"
          onSelect={onSelect}
        >
          {() => (
            <a
              href="/locais/campeche?data=2026-09-09"
              onClick={(event) => {
                event.preventDefault();
                onClick();
              }}
            >
              Ver previsão completa
            </a>
          )}
        </DayCarousel>
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Ver previsão completa' });
    fireEvent.pointerDown(link, { button: 0, pointerType: 'mouse', clientX: 0 });
    fireEvent.pointerMove(link, { pointerType: 'mouse', clientX: 40 });
    fireEvent.pointerUp(link, { pointerType: 'mouse', clientX: 40 });
    fireEvent.click(link);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
