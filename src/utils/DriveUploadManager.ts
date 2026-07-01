import { TheftTrack } from './NativeTheftTrack';
import * as DriveService from './GoogleDriveService';

export interface UploadState {
  isUploading: boolean;
  statusMsg: string | null;
  statusIsError: boolean;
}

type Listener = (state: UploadState) => void;

let state: UploadState = { isUploading: false, statusMsg: null, statusIsError: false };
const listeners = new Set<Listener>();

function emit() {
  const snap = { ...state };
  listeners.forEach(l => l(snap));
}

function set(partial: Partial<UploadState>) {
  state = { ...state, ...partial };
  emit();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener({ ...state });
  return () => listeners.delete(listener);
}

export function getState(): UploadState {
  return { ...state };
}

export function dismiss() {
  if (!state.isUploading) set({ statusMsg: null, statusIsError: false });
}

export async function start(uploadPictures: boolean, uploadVideos: boolean): Promise<void> {
  if (state.isUploading) return;

  if (!uploadPictures && !uploadVideos) {
    set({ statusMsg: 'Enable Pictures or Videos to upload.', statusIsError: true });
    return;
  }

  set({ isUploading: true, statusMsg: 'Preparing upload…', statusIsError: false });

  try {
    const accessToken = await DriveService.getAccessToken();
    const logs = await TheftTrack.getIntrusionLogs();

    if (logs.length === 0) {
      set({ isUploading: false, statusMsg: 'No intrusion logs to upload.', statusIsError: true });
      return;
    }

    set({ statusMsg: `Uploading ${logs.length} intrusion${logs.length !== 1 ? 's' : ''}…` });

    await TheftTrack.uploadToDrive(
      accessToken,
      JSON.stringify(logs),
      uploadPictures,
      uploadVideos,
    );

    set({
      isUploading: false,
      statusMsg: `Upload complete · ${new Date().toLocaleString()}`,
      statusIsError: false,
    });
  } catch (e: any) {
    set({
      isUploading: false,
      statusMsg: e.message ?? 'Upload failed.',
      statusIsError: true,
    });
  }
}
