import { useQuery } from "@tanstack/react-query";

import { getArchiveTreeApi } from "@/features/archive-tree/api";

export const ARCHIVE_TREE_QUERY_KEY = ["archive-tree"];

export function useArchiveTree() {
  return useQuery({
    queryKey: ARCHIVE_TREE_QUERY_KEY,
    queryFn: getArchiveTreeApi,
  });
}