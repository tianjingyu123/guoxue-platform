export interface AncientPlaceInput {
  placeName?: string;
  dynasty?: string;
  modernProvince?: string;
}

export interface PlaceInfo {
  ancientName: string;
  modernName: string;
  province: string;
  city: string;
  dynasty: string;
  changeHistory: string;
  famousEvents: string[];
  relatedPeople: string[];
}

export interface AncientPlaceResult {
  places: PlaceInfo[];
  summary: string;
}
