import {
  type ChangeEvent,
  type SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  assessVideoFile,
  assessVideoMetadata,
  formatDuration,
  metadataUnavailable,
  type MetadataAssessment,
} from './capture-validation';
import {
  describeVideo,
  formatVideoSize,
  type VideoSelection,
} from './video-selection';

export function CapturePanel() {
  const activePreviewUrl = useRef<string | null>(null);
  const [selection, setSelection] = useState<VideoSelection | null>(null);
  const [validation, setValidation] = useState<MetadataAssessment | null>(null);

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
    const nextSelection = describeVideo(file, previewUrl);
    setSelection(nextSelection);
    setValidation(
      assessVideoFile({
        fileSizeBytes: nextSelection.size,
        mimeType: nextSelection.type,
      }),
    );
    event.currentTarget.value = '';
  }

  function handleMetadata(event: SyntheticEvent<HTMLVideoElement>) {
    if (!selection) {
      return;
    }

    setValidation(
      assessVideoMetadata(
        { fileSizeBytes: selection.size, mimeType: selection.type },
        {
          durationSeconds: event.currentTarget.duration,
          widthPixels: event.currentTarget.videoWidth,
          heightPixels: event.currentTarget.videoHeight,
        },
      ),
    );
  }

  function clearSelection() {
    releasePreview();
    setSelection(null);
    setValidation(null);
  }

  return (
    <section className="capture" id="capture" aria-labelledby="capture-title">
      <div className="capture-copy">
        <p className="eyebrow">Start with a video</p>
        <h2 id="capture-title">Choose or record a room video.</h2>
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
              onLoadedMetadata={handleMetadata}
              onError={() =>
                setValidation((current) =>
                  current?.assessment === 'rejected'
                    ? current
                    : metadataUnavailable(),
                )
              }
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
              {validation?.metadata ? (
                <>
                  <div>
                    <dt>Duration</dt>
                    <dd>
                      {formatDuration(validation.metadata.durationSeconds)}
                    </dd>
                  </div>
                  <div>
                    <dt>Resolution</dt>
                    <dd>
                      {validation.metadata.widthPixels} ×{' '}
                      {validation.metadata.heightPixels}
                    </dd>
                  </div>
                </>
              ) : null}
            </dl>
            {validation ? (
              <div
                className={`capture-assessment ${validation.assessment}`}
                role={validation.assessment === 'rejected' ? 'alert' : 'status'}
              >
                <strong>
                  {validation.assessment === 'checking'
                    ? 'Checking duration and resolution…'
                    : validation.assessment === 'accepted'
                      ? 'Video meets the pilot metadata checks.'
                      : 'Choose or record a different video.'}
                </strong>
                {validation.checks.map((check) => (
                  <p key={check.code}>{check.message}</p>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <div className="video-empty">
            <span aria-hidden="true">▶</span>
            <p>Select a video from this phone or computer.</p>
          </div>
        )}

        <div className="capture-actions">
          <label className="primary-action video-picker">
            {selection ? 'Replace from library' : 'Choose from library'}
            <input type="file" accept="video/*" onChange={handleSelection} />
          </label>
          <label className="secondary-action video-picker">
            {selection ? 'Record again' : 'Record with camera'}
            <input
              type="file"
              accept="video/*"
              capture="environment"
              aria-describedby="camera-note"
              onChange={handleSelection}
            />
          </label>
          {selection ? (
            <button
              className="quiet-action"
              type="button"
              onClick={clearSelection}
            >
              Remove video
            </button>
          ) : null}
        </div>
        <p className="camera-note" id="camera-note">
          On supported phones, recording opens the rear camera. Your device
          controls camera access and may ask for permission first. Other devices
          may show a file picker.
        </p>
      </div>
    </section>
  );
}
