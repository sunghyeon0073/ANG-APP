import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { startActivityAsync } from 'expo-intent-launcher';
import { Alert, Platform } from 'react-native';

import { API_URL } from './config';
import { ApiError, errorMessage, refreshAccessToken, session } from './api';

/** document picker 로 고른 파일 (업로드 전 상태) */
export type PickedFile = DocumentPicker.DocumentPickerAsset;

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  hwp: 'application/x-hwp',
  hwpx: 'application/haansofthwpx',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',
  zip: 'application/zip',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
};

export const mimeOf = (fileName?: string | null) =>
  MIME_BY_EXT[(fileName?.split('.').pop() ?? '').toLowerCase()] ?? 'application/octet-stream';

/** 파일 선택. 취소하면 빈 배열 */
export async function pickFiles(multiple = false): Promise<PickedFile[]> {
  const result = await DocumentPicker.getDocumentAsync({ multiple, copyToCacheDirectory: true });
  return result.canceled ? [] : result.assets;
}

/**
 * multipart 업로드용 FormData 파트.
 * 네이티브는 RN 의 {uri, name, type} 객체, 웹은 picker 가 넘겨준 브라우저 File 을 그대로 쓴다.
 */
export function appendFile(form: FormData, field: string, file: PickedFile) {
  if (Platform.OS === 'web' && file.file) {
    form.append(field, file.file, file.name);
    return;
  }
  const part = { uri: file.uri, name: file.name || 'file', type: file.mimeType || mimeOf(file.name) };
  form.append(field, part as unknown as Blob);
}

/* ─────────────── 다운로드 ─────────────── */

const safeName = (name: string) => name.replace(/[\\/:*?"<>|]/g, '_') || 'download';

const authHeaders = (): Record<string, string> => {
  const token = session.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/** 인증 헤더가 필요한 파일을 앱 캐시에 받는다. 401 이면 토큰 갱신 후 한 번 재시도 */
async function downloadToCache(path: string, fileName: string): Promise<File> {
  const dir = new Directory(Paths.cache, 'downloads');
  dir.create({ idempotent: true, intermediates: true });
  const target = new File(dir, safeName(fileName));
  const url = `${API_URL}${path}`;

  try {
    return await File.downloadFileAsync(url, target, { headers: authHeaders(), idempotent: true });
  } catch (e) {
    if (!String((e as Error)?.message ?? '').includes('401')) throw e;
    if (!(await refreshAccessToken())) throw new ApiError(401, '로그인이 만료되었습니다. 다시 로그인해주세요.');
    return File.downloadFileAsync(url, target, { headers: authHeaders(), idempotent: true });
  }
}

/** 웹: fetch 로 받아 브라우저 다운로드를 띄운다 */
async function downloadOnWeb(path: string, fileName: string) {
  const get = () => fetch(`${API_URL}${path}`, { headers: authHeaders() });
  let res = await get();
  if (res.status === 401 && (await refreshAccessToken())) res = await get();
  if (!res.ok) throw new ApiError(res.status, `파일을 받지 못했습니다. (${res.status})`);
  const blobUrl = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

/**
 * 파일을 받아 기기의 뷰어 앱으로 연다 (Android ACTION_VIEW + FileProvider content URI).
 * 열 수 있는 앱이 없으면 에러를 던진다.
 */
export async function downloadAndOpen(path: string, fileName: string) {
  if (Platform.OS === 'web') return downloadOnWeb(path, fileName);
  const file = await downloadToCache(path, fileName);
  try {
    await startActivityAsync('android.intent.action.VIEW', {
      data: file.contentUri,
      type: mimeOf(fileName),
      flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
    });
  } catch {
    throw new Error('이 파일을 열 수 있는 앱이 없습니다. "기기에 저장"으로 받아주세요.');
  }
}

/**
 * 파일을 받아 사용자가 고른 폴더(예: Download)에 저장한다 (Android 저장소 접근 프레임워크).
 * 폴더 선택을 취소하면 false.
 */
export async function downloadAndSave(path: string, fileName: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    await downloadOnWeb(path, fileName);
    return true;
  }
  const cached = await downloadToCache(path, fileName);
  let dir: Directory;
  try {
    dir = await Directory.pickDirectoryAsync();
  } catch {
    return false;
  }
  const saved = dir.createFile(safeName(fileName), mimeOf(fileName));
  saved.write(await cached.bytes());
  return true;
}

/** 첨부파일을 눌렀을 때: 열기 / 기기에 저장 선택 */
export function showFileActions(path: string, fileName: string) {
  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
    } catch (e) {
      Alert.alert('파일', errorMessage(e, '파일을 받지 못했습니다.'));
    }
  };
  if (Platform.OS === 'web') return run(() => downloadOnWeb(path, fileName));
  Alert.alert(fileName, undefined, [
    { text: '취소', style: 'cancel' },
    {
      text: '기기에 저장',
      onPress: () =>
        run(async () => {
          if (await downloadAndSave(path, fileName)) Alert.alert('저장 완료', `${fileName} 파일을 저장했습니다.`);
        }),
    },
    { text: '열기', onPress: () => run(() => downloadAndOpen(path, fileName)) },
  ]);
}
