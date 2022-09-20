import { Player } from "@ns"
import { City } from "/data/LocationNames"

export interface TypedPlayer extends Player {
  city: City
}

export function convertToTypedPlayer(player: Player): TypedPlayer {
  if (!(Object.values(City) as Array<string>).includes(player.city)) {
    throw Error(`City ${player.city} doesn't exist in city enum ${Object.values(City).join(", ")}`)
  }

  return {
    ...player,

    city: City[player.city as keyof typeof City],
  }
}
