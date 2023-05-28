import { Coordinate, Point } from "./geo"

/**
 * for global type:such as MapView MapEvent etc;
 */

export type MapViewType = {
    center?: Array<number> | Coordinate;
    zoom?: number;
    pitch?: number;
    bearing?: number;
    around?: Point;
}
export type MapDataURLType = {
    mimeType?: string;
    save?: boolean;
    quality?: number
}

export type MapPanelsType = {
    [key: string]: HTMLDivElement
}

export type GeoPropertiesType = {
    [key: string]: any
}

export type PaddingType = {
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    paddingBottom?: number;
}

export type MapFitOptionsType = PaddingType & {
    animation?: boolean;
}