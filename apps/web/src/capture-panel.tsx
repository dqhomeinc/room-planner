import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import {
  describeVideo,
  formatVideoSize,
  type VideoSelection,
} from './video-selection';

export function CapturePanel() {
  const activePreviewUrl = useRef<string | null>(null);
  const [selection, setSelection] = useState<VideoSelection | null>(null);

  useEffect(
    () => () => {
      if (activePreviewUrl.current) {
        URL.revokeObjectURL(activePreviewUrl.current);
      }
    },
    [],
  );

  function releasePreview() {
    if (activePreviewUrl.current) {
      URL.revokeObjectURL(activePreviewUrl.current);
      activePreviewUrl.current = null;
    }
  }

  function handleSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }

    releasePreview();
    const previewUrl = URL.createObjectURL(file);
    activePreviewUrl.current = previewUrl;
    setSelection(describeVideo(file, previewUrl));
    event.currentTarget.value = '';
  }

  function clearSelection() {
    releasePreview();
    setSelection(null);
  }

  return (
    <section className="capture" id="capture" aria-labelledby="capture-title">
      <div className="capture-copy">
        <p className="eyebrow">Start with a video</p>
        <h2 id="capture-title">Choose a room video to preview.</h2>
        <p>
          The video stays on this device. This preview does not upload or
          process it yet.
        </p>
      </div>

      <div className="capture-card">
        {selection ? (
          <>
            <video
              className="video-preview"
              src={selection.previewUrl}
              controls
              playsInline
              preload="metadata"
              aria-label={`Preview of ${selection.name}`}
            />
            <dl className="video-details">
              <div>
                <dt>File</dt>
                <dd>{selection.name}</dd>
              </div>
              <div>
                <dt>Format</dt>
                <dd>{selection.type}</dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd>{formatVideoSize(selection.size)}</dd>
              </div>
            </dl>
          </>
        ) : (
          <div className="video-empty">
            <span aria-hidden="true">▶</span>
            <p>Select a video from this phone or computer.</p>
          </div>
        )}

        <div className="capture-actions">
          <label className="primary-action video-picker">
            {selection ? 'Replace video' : 'Choose video'}
            <input type="file" accept="video/*" onChange={handleSelection} />
          </label>
          {selection ? (
            <button className="secondary-action" onClick={clearSelection}>
              Remove video
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
