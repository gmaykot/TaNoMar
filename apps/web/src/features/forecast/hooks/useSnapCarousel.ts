import { useCallback, useEffect, useRef } from 'react';

interface UseSnapCarouselOptions {
  selectedKey: string;
  onSelect: (key: string) => void;
  align?: 'start' | 'center';
}

function snapChild(root: HTMLElement, key: string) {
  return root.querySelector<HTMLElement>(`[data-snap-key="${key}"]`);
}

function scrollToChild(
  root: HTMLElement,
  child: HTMLElement,
  align: 'start' | 'center',
  behavior: ScrollBehavior,
) {
  const left =
    align === 'center'
      ? child.offsetLeft - (root.clientWidth - child.offsetWidth) / 2
      : child.offsetLeft;
  const nextLeft = Math.max(0, left);
  if (typeof root.scrollTo === 'function') {
    root.scrollTo({ left: nextLeft, behavior });
    return;
  }
  root.scrollLeft = nextLeft;
}

function nearestKey(root: HTMLElement, align: 'start' | 'center') {
  const children = [...root.querySelectorAll<HTMLElement>('[data-snap-key]')];
  if (children.length === 0) return '';

  const origin = align === 'center' ? root.scrollLeft + root.clientWidth / 2 : root.scrollLeft;
  let best = children[0]!;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const child of children) {
    const position =
      align === 'center' ? child.offsetLeft + child.offsetWidth / 2 : child.offsetLeft;
    const dist = Math.abs(position - origin);
    if (dist < bestDist) {
      bestDist = dist;
      best = child;
    }
  }

  return best.dataset.snapKey ?? '';
}

export function useSnapCarousel({
  selectedKey,
  onSelect,
  align = 'start',
}: UseSnapCarouselOptions) {
  const ref = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  const selectedKeyRef = useRef(selectedKey);

  useEffect(() => {
    onSelectRef.current = onSelect;
    selectedKeyRef.current = selectedKey;
  }, [onSelect, selectedKey]);

  const scrollToKey = useCallback(
    (key: string, behavior: ScrollBehavior = 'smooth') => {
      const root = ref.current;
      if (!root || !key) return;
      const child = snapChild(root, key);
      if (!child) return;
      scrollToChild(root, child, align, behavior);
    },
    [align],
  );

  useEffect(() => {
    scrollToKey(selectedKey, 'instant');
  }, [scrollToKey, selectedKey]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const commit = () => {
      const key = nearestKey(root, align);
      if (key && key !== selectedKeyRef.current) onSelectRef.current(key);
    };

    if ('onscrollend' in window) {
      root.addEventListener('scrollend', commit);
      return () => root.removeEventListener('scrollend', commit);
    }

    let timer = 0;
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(commit, 80);
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      root.removeEventListener('scroll', onScroll);
    };
  }, [align]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    let startX = 0;
    let startScroll = 0;
    let dragging = false;
    let dragged = false;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      dragging = true;
      dragged = false;
      startX = event.clientX;
      startScroll = root.scrollLeft;
      root.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const delta = event.clientX - startX;
      if (Math.abs(delta) > 8) dragged = true;
      if (dragged) root.scrollLeft = startScroll - delta;
    };

    const onPointerUp = () => {
      dragging = false;
    };

    const onClickCapture = (event: MouseEvent) => {
      if (!dragged) return;
      event.preventDefault();
      event.stopPropagation();
      dragged = false;
    };

    root.addEventListener('pointerdown', onPointerDown);
    root.addEventListener('pointermove', onPointerMove);
    root.addEventListener('pointerup', onPointerUp);
    root.addEventListener('pointercancel', onPointerUp);
    root.addEventListener('click', onClickCapture, true);

    return () => {
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerup', onPointerUp);
      root.removeEventListener('pointercancel', onPointerUp);
      root.removeEventListener('click', onClickCapture, true);
    };
  }, []);

  return { ref, scrollToKey };
}
