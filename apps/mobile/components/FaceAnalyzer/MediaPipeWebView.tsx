import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

export interface MediaPipeRef {
  analyzeImage: (base64DataUri: string) => void;
}

interface Props {
  onLandmarks: (landmarks: number[][]) => void;
  onError?: (msg: string) => void;
  onReady?: () => void;
}

// The HTML runs MediaPipe Face Mesh entirely on-device (CDN loaded once, then cached).
const MEDIAPIPE_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{margin:0;background:#000}</style>
</head>
<body>
<canvas id="c" style="display:none"></canvas>
<script>
(function(){
  var CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/';
  var CDN_FALLBACK = 'https://unpkg.com/@mediapipe/face_mesh@0.4/';

  function loadScript(cdn, fallback) {
    var s = document.createElement('script');
    s.src = cdn + 'face_mesh.js';
    s.crossOrigin = 'anonymous';
    s.onload = function() { CDN = cdn; initFaceMesh(); };
    s.onerror = function() {
      if (fallback) {
        loadScript(fallback, null);
      } else {
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',msg:'CDN load failed'}));
      }
    };
    document.head.appendChild(s);
  }
  loadScript(CDN, CDN_FALLBACK);

  var faceMesh;
  function initFaceMesh() {
    faceMesh = new FaceMesh({
      locateFile: function(f) { return CDN + f; }  // CDN var updated by loadScript
    });
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    faceMesh.onResults(function(results) {
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        var lm = results.multiFaceLandmarks[0];
        var pts = lm.map(function(p){ return [p.x, p.y, p.z]; });
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'landmarks',data:pts}));
      } else {
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',msg:'no_face_detected'}));
      }
    });
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));
  }

  window.analyzeImage = function(dataUri) {
    if (!faceMesh) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',msg:'not_ready'}));
      return;
    }
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      var c = document.getElementById('c');
      c.width = img.width;
      c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      faceMesh.send({image: c}).catch(function(e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',msg:String(e)}));
      });
    };
    img.onerror = function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',msg:'img_load_failed'}));
    };
    img.src = dataUri;
  };
})();
</script>
</body>
</html>`;

const MediaPipeWebView = forwardRef<MediaPipeRef, Props>(({ onLandmarks, onError, onReady }, ref) => {
  const webviewRef = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    analyzeImage: (base64DataUri: string) => {
      if (webviewRef.current) {
        // Escape backticks in data URI (extremely rare but safe)
        const safe = base64DataUri.replace(/`/g, "\\`");
        webviewRef.current.injectJavaScript(
          `window.analyzeImage(\`${safe}\`); true;`
        );
      }
    },
  }));

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as {
        type: string;
        data?: number[][];
        msg?: string;
      };
      if (msg.type === "landmarks" && msg.data) {
        onLandmarks(msg.data);
      } else if (msg.type === "error") {
        onError?.(msg.msg ?? "unknown error");
      } else if (msg.type === "ready") {
        onReady?.();
      }
    } catch {
      // Ignore non-JSON messages from the WebView
    }
  };

  return (
    <View style={{ width: 1, height: 1, overflow: "hidden" }}>
      <WebView
        ref={webviewRef}
        source={{ html: MEDIAPIPE_HTML }}
        style={{ width: 1, height: 1 }}
        onMessage={handleMessage}
        javaScriptEnabled
        originWhitelist={["*"]}
        // Allow mixed content for CDN
        mixedContentMode="always"
        // Suppress console logs in prod
        onError={() => onError?.("webview_error")}
      />
    </View>
  );
});

MediaPipeWebView.displayName = "MediaPipeWebView";
export default MediaPipeWebView;
