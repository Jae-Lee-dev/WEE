"use client";

const kakaoMapsScriptId = "kakao-maps-sdk";

let kakaoMapsSdkPromise: Promise<KakaoMapsSdk> | null = null;

export type KakaoLatLng = unknown;

export type KakaoMap = {
  relayout: () => void;
  setCenter: (latLng: KakaoLatLng) => void;
  setLevel: (level: number) => void;
};

export type KakaoMarker = {
  setMap: (map: KakaoMap | null) => void;
  setPosition: (latLng: KakaoLatLng) => void;
};

export type KakaoCircle = {
  setMap: (map: KakaoMap | null) => void;
  setOptions: (options: { center: KakaoLatLng; radius: number }) => void;
  setPosition: (latLng: KakaoLatLng) => void;
  setRadius: (radius: number) => void;
};

export type KakaoGeocoderResult = {
  address_name: string;
  x: string;
  y: string;
};

export type KakaoGeocoder = {
  addressSearch: (
    address: string,
    callback: (result: KakaoGeocoderResult[], status: string) => void,
  ) => void;
};

export type KakaoMapsSdk = {
  Circle: new (options: {
    center: KakaoLatLng;
    fillColor: string;
    fillOpacity: number;
    map?: KakaoMap | null;
    radius: number;
    strokeColor: string;
    strokeOpacity: number;
    strokeWeight: number;
  }) => KakaoCircle;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  Map: new (
    container: HTMLElement,
    options: { center: KakaoLatLng; level: number },
  ) => KakaoMap;
  Marker: new (options: {
    map?: KakaoMap | null;
    position: KakaoLatLng;
  }) => KakaoMarker;
  load: (callback: () => void) => void;
  services: {
    Geocoder: new () => KakaoGeocoder;
    Status: {
      OK: string;
    };
  };
};

declare global {
  interface Window {
    kakao?: {
      maps: KakaoMapsSdk;
    };
  }
}

export function loadKakaoMapsSdk(appKey: string) {
  const normalizedAppKey = appKey.trim();

  if (!normalizedAppKey) {
    return Promise.reject(new Error("Kakao Maps JavaScript key is missing."));
  }

  if (typeof window === "undefined") {
    return Promise.reject(new Error("Kakao Maps SDK requires a browser."));
  }

  if (window.kakao?.maps) {
    return waitForKakaoMapsAutoload();
  }

  if (kakaoMapsSdkPromise) {
    return kakaoMapsSdkPromise;
  }

  kakaoMapsSdkPromise = new Promise<KakaoMapsSdk>((resolve, reject) => {
    const existingScript = document.getElementById(kakaoMapsScriptId);

    const handleLoad = () => {
      if (!window.kakao?.maps) {
        reject(new Error("Kakao Maps SDK did not initialize."));
        return;
      }

      window.kakao.maps.load(() => {
        if (window.kakao?.maps) {
          resolve(window.kakao.maps);
        } else {
          reject(new Error("Kakao Maps SDK did not load maps."));
        }
      });
    };

    const handleError = () => {
      reject(new Error("Kakao Maps SDK failed to load."));
    };

    existingScript?.remove();

    const script = document.createElement("script");

    script.id = kakaoMapsScriptId;
    script.async = true;
    script.src = createKakaoMapsSdkUrl(normalizedAppKey);
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    kakaoMapsSdkPromise = null;
    throw error;
  });

  return kakaoMapsSdkPromise;
}

export function getKakaoMapJavaScriptKey() {
  return process.env.NEXT_PUBLIC_KAKAO_MAP_JAVASCRIPT_KEY?.trim() ?? "";
}

function waitForKakaoMapsAutoload() {
  return new Promise<KakaoMapsSdk>((resolve) => {
    window.kakao?.maps.load(() => {
      resolve(window.kakao?.maps as KakaoMapsSdk);
    });
  });
}

function createKakaoMapsSdkUrl(appKey: string) {
  const params = new URLSearchParams({
    appkey: appKey,
    autoload: "false",
    libraries: "services",
  });

  return `https://dapi.kakao.com/v2/maps/sdk.js?${params.toString()}`;
}
