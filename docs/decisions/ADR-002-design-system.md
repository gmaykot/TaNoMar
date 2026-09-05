# ADR-002 — Design system desde a fundação

## Status

Aceita.

## Decisão

Usar CSS Modules e tokens CSS centrais com identidade TáNoMar desde o primeiro componente. Sora é servida localmente para a interface; Caveat entra só em destaques emocionais. Componentes globais residem apenas em `apps/web/src/design-system`.

## Motivo

Evita uma interface genérica tematizada depois, valores arbitrários e acoplamento a framework de estilos. Mantém a marca perceptível, consistente e offline.

## Consequências

Tailwind e CSS-in-JS não fazem parte da fundação. Novos valores visuais devem reutilizar ou justificar alteração dos tokens.
