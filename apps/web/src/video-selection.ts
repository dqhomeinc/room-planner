export type VideoSelection = {
  mimeType: string;
  name: string;
  previewUrl: string;
  size: number;
  type: string;
};

type VideoFileDetails = Pick<File, 'name' | 'size' | 'type'>;

export function describeVideo(
  file: VideoFileDetails,
  previewUrl: string,
): VideoSelection {
  return {
    mimeType: file.type,
    name: file.name,
    previewUrl,
    size: file.size,
    type: file.type || 'Unknown video format',
  };
}

export function formatVideoSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(kilobytes < 10 ? 1 : 0)} KB`;
  }

  const megabytes = kilobytes / 1024;
  return `${megabytes.toFixed(megabytes < 10 ? 1 : 0)} MB`;
}
