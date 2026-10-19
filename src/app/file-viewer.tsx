import { Paths } from 'expo-file-system';
import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { Button, EmptyState, Header, IconButton, Loading, Screen } from '@/components/ui';
import { Colors } from '@/constants/theme';

/**
 * 받은 첨부파일을 앱 안에서 보여준다 (iOS).
 * WKWebView 가 pdf / Office 문서 / 이미지 / 텍스트를 자체 렌더링한다.
 * 저장하거나 다른 앱으로 열 때는 오른쪽 위 공유 버튼을 쓴다.
 */
export default function FileViewerScreen() {
  const { uri, name } = useLocalSearchParams<{ uri: string; name?: string }>();
  const [failed, setFailed] = useState(false);
  const share = () => Sharing.shareAsync(uri);

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={name || '첨부파일'} back right={<IconButton name="share" onPress={share} />} />
      {failed ? (
        <EmptyState
          icon="file"
          title="미리 볼 수 없는 파일입니다"
          description="공유 버튼으로 다른 앱에서 열거나 파일에 저장해주세요."
          action={<Button title="다른 앱으로 열기" icon="share" onPress={share} style={{ marginTop: 16 }} />}
        />
      ) : (
        <WebView
          source={{ uri }}
          originWhitelist={['*']}
          allowingReadAccessToURL={Paths.cache.uri}
          allowFileAccess
          startInLoadingState
          renderLoading={() => (
            <View style={StyleSheet.absoluteFill}>
              <Loading label="파일을 여는 중..." />
            </View>
          )}
          onError={() => setFailed(true)}
          style={{ flex: 1, backgroundColor: Colors.bg }}
        />
      )}
    </Screen>
  );
}
