import "csstype";

declare module "csstype" {
  interface Properties {
    "--foreground"?: string;
    "--background"?: string;
    "--card"?: string;
    "--muted-foreground"?: string;
    "--border"?: string;
    "--text-travel"?: string | number;
    "--text-duration"?: string | number;
    "--text-play"?: string | number;
    "--pure-fill"?: string | number;
    "--mix-tint"?: string | number;
    "--note-tail"?: string | number;
    "--note-shadow"?: string | number;
    "--release-surface"?: string | number;
    "--release-color-one"?: string | number;
    "--release-color-two"?: string | number;
    "--release-color-three"?: string | number;
  }
}

declare global {
  interface MediaDevices {
    selectAudioOutput?: (options?: { deviceId?: string }) => Promise<MediaDeviceInfo>;
  }
}
