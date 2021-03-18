import { Icon } from 'leaflet';
import defaultIconDataUrl from './assets/marker.svg';
import plusIconDataUrl from './assets/plus.svg';
import markerShadowUrl from './assets/marker-shadow.png';

function createIcon(colors: Record<string, string>) {
    let url = defaultIconDataUrl;
    for (const key of Object.keys(colors)) {
        url = url.replace(new RegExp(`%24%7b${key}%7d`, 'g'), encodeURIComponent(colors[key]))
    }
    return new Icon.Default({ imagePath: new String('') as string, iconUrl: url, iconRetinaUrl: url, shadowUrl: markerShadowUrl }) as Icon;
}

export const defaultIcon = createIcon({ color1: "#2e6c97", color2: "#3883b7", color3: "#126fc6", color4: "#4c9cd1" });
export const startIcon = createIcon({ color1: "#2E9749", color2: "#06EA3F", color3: "#03D337", color4: "#40DD68" });
export const endIcon = createIcon({ color1: "#972E2E", color2: "#B73838", color3: "#C61212", color4: "#D14C4C" });

export const plusIcon = new Icon({
    iconUrl: plusIconDataUrl,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});