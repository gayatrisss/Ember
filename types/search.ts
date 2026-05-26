export type RIDBFacility = {
  FacilityID: string | number;
  FacilityName: string;
  FacilityTypeDescription: string;
  FacilityDescription: string;
};

export type RIDBRecArea = {
  RecAreaID: string | number;
  RecAreaName: string;
};

export type SearchRawResponse = {
  facilities: { RECDATA: RIDBFacility[] };
  areas: { RECDATA: RIDBRecArea[] };
};
