import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type MasterDataItemBase = {
  id: string | number;
};

interface UseMasterDataCrudOptions<TItem extends MasterDataItemBase, TPayload> {
  queryKey: string[];
  listFn: () => Promise<TItem[]>;
  createFn: (payload: TPayload) => Promise<TItem>;
  updateFn: (id: string | number, payload: Partial<TPayload>) => Promise<TItem>;
  deleteFn: (id: string | number) => Promise<void>;
}

export function useMasterDataCrud<TItem extends MasterDataItemBase, TPayload>({
  queryKey,
  listFn,
  createFn,
  updateFn,
  deleteFn,
}: UseMasterDataCrudOptions<TItem, TPayload>) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey,
    queryFn: listFn,
  });

  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      await queryClient.invalidateQueries({ queryKey: ["archive-tree"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: Partial<TPayload>;
    }) => updateFn(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      await queryClient.invalidateQueries({ queryKey: ["archive-tree"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      await queryClient.invalidateQueries({ queryKey: ["archive-tree"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return {
    listQuery,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}