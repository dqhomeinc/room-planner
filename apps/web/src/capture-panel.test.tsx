import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CapturePanel } from './capture-panel';

describe('capture panel', () => {
  it('offers a rear-camera recording path with permission guidance', () => {
    const markup = renderToStaticMarkup(<CapturePanel />);

    expect(markup).toContain('capture="environment"');
    expect(markup).toContain('Record with camera');
    expect(markup).toContain('may ask for permission first');
  });

  it('keeps both capture paths limited to video files', () => {
    const markup = renderToStaticMarkup(<CapturePanel />);

    expect(markup.match(/accept="video\/\*"/g)).toHaveLength(2);
  });
});
