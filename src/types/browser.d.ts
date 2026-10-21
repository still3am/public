import "csstype";

declare module "csstype" {
  interface Properties {
    [property: `--${string}`]: string | number | undefined;
  }
}

declare global {
  interface MediaDevices {
    selectAudioOutput?: (options?: { deviceId?: string }) => Promise<MediaDeviceInfo>;
  }
}
