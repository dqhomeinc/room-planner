import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from './app';

describe('app entry points', () => {
  it('links both hero actions to sections rendered on the page', () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain('href="#room-builder"');
    expect(markup).toContain('id="room-builder"');
    expect(markup).toContain('href="#capture"');
    expect(markup).toContain('id="capture"');
    expect(markup).toContain('Enter room dimensions');
    expect(markup).toContain('Or choose a room video');
  });

  it('describes dimensions and video as alternative starting points', () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain('Start with room dimensions you already know');
    expect(markup).toContain('From room input to a practical plan.');
    expect(markup).toContain('Enter known dimensions or choose a video');
  });
});
