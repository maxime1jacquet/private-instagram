export interface TravelImage {
  id: string;
  url: string;
  thumbnail: string;
}
export interface TravelCard {
  id: string;
  title: string;
  image: TravelImage | null;
}
export type Voyage = TravelCard;
export interface Etape extends TravelCard {
  voyageId: string;
  description: string;
  created: string;
}
export interface VoyageDetail {
  voyage: Voyage;
  etapes: Etape[];
}
export interface EtapeDetail {
  voyage: Voyage;
  etape: Etape;
  images: TravelImage[];
}
export type TravelState<T> =
  | { status: 'loading'; data: null; error: '' }
  | { status: 'ready'; data: T; error: '' }
  | { status: 'error'; data: null; error: string };
