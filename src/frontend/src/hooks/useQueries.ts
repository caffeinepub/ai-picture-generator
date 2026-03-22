import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Generation } from "../backend.d";
import { useActor } from "./useActor";

export function useGetGenerations() {
  const { actor, isFetching } = useActor();
  return useQuery<Generation[]>({
    queryKey: ["generations"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getGenerations();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useSaveGeneration() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      prompt,
      style,
      imageUrl,
    }: {
      prompt: string;
      style: string;
      imageUrl: string;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.saveGeneration(prompt, style, imageUrl);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generations"] });
    },
  });
}

export function useDeleteGeneration() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteGeneration(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generations"] });
    },
  });
}
