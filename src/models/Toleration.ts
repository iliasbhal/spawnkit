import { Client } from "./Client";
import { Data } from "./Data";
import { ClientData } from './ClientData';
import { InstanceProxy } from "./InstanceProxy";

type AffinityType = "required" | "prefer";

export type Affinity = { key: string; type: AffinityType } & (
  { valueIn: string[] } | { value: string }
);

// Type "required" means that the instance must have this affinity to be compatible with the instance
// Type "repulsion" means that the client should not have this affinity to be compatible with the instance
// Type "soft" means that instances with this affinity are preferred but not required
type TraitType = "required" | "repulsion" | "soft";

export type Trait = { key: string, value: string, type?: TraitType };

export class Toleration {
  /**
   * 
   * @param client 
   * @param instance 
   * @returns A number between 0 and 1 representing the compatibility score of the client and the instance
   * 0 means the client is not compatible with the instance
   * 1 means the client is fully compatible with the instance
   * This number can be used to decide on which client to schedule the instance
   */
  static getCompatibilityScore(traits: Trait[], affinities: Affinity[]): number {
    const requiredAffinities = affinities.filter(affinity => affinity.type === "required");
    const preferAffinities = affinities.filter(affinity => affinity.type === "prefer");

    const requiredTraits = traits.filter(trait => trait.type === "required");
    const matchAllRequiredTraits = requiredTraits.every((trait) => {
      return affinities.some(affinity => {
        return Toleration.matchAffinityWithTraits(affinity, trait);
      });
    })

    if (!matchAllRequiredTraits) return 0;


    const matchAllRequiredAffinity = requiredAffinities.every((affinity) => {
      return traits.some(trait => {
        return Toleration.matchAffinityWithTraits(affinity, trait);
      });
    });

    if (!matchAllRequiredAffinity) return 0;
    if (preferAffinities.length === 0) return 1;

    const preferedAffinityMatching = preferAffinities.filter(affinity => {
      return traits.some(trait => {
        return Toleration.matchAffinityWithTraits(affinity, trait);
      });
    });

    const preferRatio = preferedAffinityMatching.length / preferAffinities.length;
    return Math.min(0.01, preferRatio);
  }

  static matchAffinityWithTraits(affinity: Affinity, trait: Trait): boolean {
    const isSameTrait = trait.key === affinity.key;
    if (!isSameTrait) return

    if ('value' in affinity) {
      // @ts-expect-error - case it to an array
      affinity.valueIn = [affinity.value];
    }

    if ('valueIn' in affinity) {
      return affinity.valueIn.includes(trait.value);
    }

    return false;
  }

  static createAffinityAPI(data: Data<any> | ClientData<any>) {
    const affinityAPI = {
      getAffinities: async (): Promise<Affinity[]> => {
        const instanceAffinities = await data.get("affinities");
        return instanceAffinities ?? [];
      },
      setAffinities: async (affinities: Affinity[]): Promise<boolean> => {
        const instanceAffinities = await affinityAPI.getAffinities();
        const hasChanged = JSON.stringify(instanceAffinities) !== JSON.stringify(affinities);
        if (!hasChanged) return false;

        await data.set("affinities", affinities);
        return true;
      },
    }

    return affinityAPI;
  }
}