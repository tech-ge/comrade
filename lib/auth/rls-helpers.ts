export const RLS = {
  universityIsolation: (row: any, user: any) =>
    row.university_id === user.university_id ||
    row.target_scope === "country" ||
    (row.target_scope === "county" && row.target_county_id === user.home_county_id),
};
