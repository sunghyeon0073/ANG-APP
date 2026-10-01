import { Alert as NativeAlert, Platform, type AlertButton } from 'react-native';

/**
 * react-native 의 Alert.alert 는 웹(react-native-web)에서 아무 동작도 하지 않으므로
 * 웹에서는 브라우저 confirm/alert 로 대체한다. 네이티브는 기존 Alert 그대로 사용.
 */
function alert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    NativeAlert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;
  const cancel = buttons?.find((b) => b.style === 'cancel');
  const confirm = buttons?.find((b) => b.style !== 'cancel');

  if (cancel && confirm) {
    if (globalThis.confirm?.(text)) confirm.onPress?.();
    else cancel.onPress?.();
    return;
  }

  globalThis.alert?.(text);
  buttons?.[0]?.onPress?.();
}

export const Alert = { alert };
