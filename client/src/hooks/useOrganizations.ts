import { listOrganizations } from "../api/organizations";
import { useAsync } from "./useAsync";

export function useOrganizations() {
  return useAsync((signal) => listOrganizations(signal), []);
}
