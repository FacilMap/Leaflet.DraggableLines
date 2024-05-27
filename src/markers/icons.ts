import { Icon } from 'leaflet';
import defaultIconSrc from './assets/marker.svg?raw';
import plusIconSrc from './assets/plus.svg?raw';
import markerShadowUrl from './assets/marker-shadow.png';

export function createSvgDataUrl(src: string): string {
	return `data:image/svg+xml;base64,${btoa(src)}`;
}

export type DefaultMarkerIconColors = {
	color1: string;
	color2: string;
	color3: string;
	color4: string;
}

export function createDefaultMarkerIconSrc(colors: Record<string, string>) {
	let src = defaultIconSrc;
	for (const key of Object.keys(colors)) {
		src = src.replace(new RegExp(`\\\$\\{${key}\\}`, 'g'), colors[key])
	}
	return src;
}

export function createDefaultMarkerIcon(colors: Record<string, string>) {
	const url = createSvgDataUrl(createDefaultMarkerIconSrc(colors));
	return new Icon.Default({ imagePath: new String('') as string, iconUrl: url, iconRetinaUrl: url, shadowUrl: markerShadowUrl }) as Icon;
}

export const defaultIcon = createDefaultMarkerIcon({ color1: "#2e6c97", color2: "#3883b7", color3: "#126fc6", color4: "#4c9cd1" });
export const startIcon = createDefaultMarkerIcon({ color1: "#2E9749", color2: "#06EA3F", color3: "#03D337", color4: "#40DD68" });
export const endIcon = createDefaultMarkerIcon({ color1: "#972E2E", color2: "#B73838", color3: "#C61212", color4: "#D14C4C" });

export const plusIcon = new Icon({
	iconUrl: createSvgDataUrl(plusIconSrc),
	iconSize: [24, 24],
	iconAnchor: [12, 12]
});