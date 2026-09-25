/** Read address fields from a FormData (shared by account + checkout actions). */
export function addressFromForm(formData: FormData, prefix = "") {
  const get = (k: string) => {
    const v = formData.get(prefix + k);
    return typeof v === "string" ? v : undefined;
  };
  return {
    label: get("label"),
    fullName: get("fullName") ?? "",
    phone: (get("phone") ?? "").replace(/\D/g, "").replace(/^(91|0)(?=[6-9]\d{9}$)/, ""),
    line1: get("line1") ?? "",
    line2: get("line2"),
    landmark: get("landmark"),
    city: get("city") ?? "",
    district: get("district"),
    state: get("state") ?? "",
    pincode: (get("pincode") ?? "").replace(/\s/g, ""),
    isDefault: get("isDefault") === "on",
  };
}
