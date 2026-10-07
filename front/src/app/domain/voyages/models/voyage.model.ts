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
  number: number;
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
  previous: Etape | null;
  next: Etape | null;
}
export type TravelState<T> =
  | { status: 'loading'; data: null; error: '' }
  | { status: 'ready'; data: T; error: '' }
  | { status: 'error'; data: null; error: string };

export interface PostAuthor {
  id: string;
  name: string;
}
export interface PostLike {
  id: string;
  author: PostAuthor;
}
export interface PostComment {
  id: string;
  author: PostAuthor;
  message: string;
  created: string;
}
export interface PostSocial {
  likes: PostLike[];
  comments: PostComment[];
}
