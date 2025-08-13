/*
 * Ward demographic and voter statistics for GHMC wards.
 *
 * This module exports an object keyed by the normalised ward name (city) used
 * throughout the dashboard.  Each entry contains the estimated number of
 * registered voters for that ward and an optional description explaining
 * the source or context.  Because comprehensive ward‑wise voter data is
 * difficult to obtain, many figures are approximated from publicly
 * available population statistics.  Where possible these estimates are
 * derived from the most recent sources (e.g. the 2011 Census or 2012
 * population reports)【185826583964071†L169-L175】【467386617029130†L159-L165】.  Users of this file should update
 * the numbers as more accurate voter enrolment figures become available.
 */

const wardDemographics = {
  Kapra: {
    voters: 32108, // Kapra total population per 2011 census【185826583964071†L169-L175】
    description:
      'Approximate number of voters based on the 2011 census population of Kapra (32,108); actual registered voters may differ.'
  },
  Habsiguda: {
    voters: 36206, // Habsiguda total population (2012)【467386617029130†L159-L165】
    description:
      'Approximate number of voters based on the 2012 population of Habsiguda (36,206); actual voter rolls may vary.'
  },
  'Jubilee Hills': {
    voters: 148869, // Jubilee Hills locality population estimate (from geoiq) – used as a proxy for voters
    description:
      'Estimated population of Jubilee Hills (148,869) used as a proxy for voter count; should be replaced with actual enrolment data.'
  }
};

export default wardDemographics;