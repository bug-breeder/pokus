/**
 * Pokus Pokedex - Generation 1
 * All 151 original Pokemon
 * 
 * Type IDs match PokeAPI: https://pokeapi.co/api/v2/type/{id}
 * Sprites: raw/pokemon/{id}.png (Gen 5 Black/White)
 * Types: raw/types/{typeId}.png
 * 
 * Type IDs:
 * 1=Normal, 2=Fighting, 3=Flying, 4=Poison, 5=Ground, 6=Rock, 7=Bug, 8=Ghost
 * 9=Steel, 10=Fire, 11=Water, 12=Grass, 13=Electric, 14=Psychic, 15=Ice
 * 16=Dragon, 17=Dark, 18=Fairy
 */

import { isDevMode } from './storage'

// Dev mode limit (first 20 Pokemon for quick testing)
const DEV_MODE_LIMIT = 20

// Full Pokedex data
const POKEDEX_FULL = [
  { id:   1, name: 'Bulbasaur', typeId: 12, typeId2:  4 }, // Grass/Poison
  { id:   2, name: 'Ivysaur', typeId: 12, typeId2:  4 }, // Grass/Poison
  { id:   3, name: 'Venusaur', typeId: 12, typeId2:  4 }, // Grass/Poison
  { id:   4, name: 'Charmander', typeId: 10, typeId2:  0 }, // Fire
  { id:   5, name: 'Charmeleon', typeId: 10, typeId2:  0 }, // Fire
  { id:   6, name: 'Charizard', typeId: 10, typeId2:  3 }, // Fire/Flying
  { id:   7, name: 'Squirtle', typeId: 11, typeId2:  0 }, // Water
  { id:   8, name: 'Wartortle', typeId: 11, typeId2:  0 }, // Water
  { id:   9, name: 'Blastoise', typeId: 11, typeId2:  0 }, // Water
  { id:  10, name: 'Caterpie', typeId:  7, typeId2:  0 }, // Bug
  { id:  11, name: 'Metapod', typeId:  7, typeId2:  0 }, // Bug
  { id:  12, name: 'Butterfree', typeId:  7, typeId2:  3 }, // Bug/Flying
  { id:  13, name: 'Weedle', typeId:  7, typeId2:  4 }, // Bug/Poison
  { id:  14, name: 'Kakuna', typeId:  7, typeId2:  4 }, // Bug/Poison
  { id:  15, name: 'Beedrill', typeId:  7, typeId2:  4 }, // Bug/Poison
  { id:  16, name: 'Pidgey', typeId:  1, typeId2:  3 }, // Normal/Flying
  { id:  17, name: 'Pidgeotto', typeId:  1, typeId2:  3 }, // Normal/Flying
  { id:  18, name: 'Pidgeot', typeId:  1, typeId2:  3 }, // Normal/Flying
  { id:  19, name: 'Rattata', typeId:  1, typeId2:  0 }, // Normal
  { id:  20, name: 'Raticate', typeId:  1, typeId2:  0 }, // Normal
  { id:  21, name: 'Spearow', typeId:  1, typeId2:  3 }, // Normal/Flying
  { id:  22, name: 'Fearow', typeId:  1, typeId2:  3 }, // Normal/Flying
  { id:  23, name: 'Ekans', typeId:  4, typeId2:  0 }, // Poison
  { id:  24, name: 'Arbok', typeId:  4, typeId2:  0 }, // Poison
  { id:  25, name: 'Pikachu', typeId: 13, typeId2:  0 }, // Electric
  { id:  26, name: 'Raichu', typeId: 13, typeId2:  0 }, // Electric
  { id:  27, name: 'Sandshrew', typeId:  5, typeId2:  0 }, // Ground
  { id:  28, name: 'Sandslash', typeId:  5, typeId2:  0 }, // Ground
  { id:  29, name: 'Nidoran♀', typeId:  4, typeId2:  0 }, // Poison
  { id:  30, name: 'Nidorina', typeId:  4, typeId2:  0 }, // Poison
  { id:  31, name: 'Nidoqueen', typeId:  4, typeId2:  5 }, // Poison/Ground
  { id:  32, name: 'Nidoran♂', typeId:  4, typeId2:  0 }, // Poison
  { id:  33, name: 'Nidorino', typeId:  4, typeId2:  0 }, // Poison
  { id:  34, name: 'Nidoking', typeId:  4, typeId2:  5 }, // Poison/Ground
  { id:  35, name: 'Clefairy', typeId:  1, typeId2:  0 }, // Normal
  { id:  36, name: 'Clefable', typeId:  1, typeId2:  0 }, // Normal
  { id:  37, name: 'Vulpix', typeId: 10, typeId2:  0 }, // Fire
  { id:  38, name: 'Ninetales', typeId: 10, typeId2:  0 }, // Fire
  { id:  39, name: 'Jigglypuff', typeId:  1, typeId2:  0 }, // Normal
  { id:  40, name: 'Wigglytuff', typeId:  1, typeId2:  0 }, // Normal
  { id:  41, name: 'Zubat', typeId:  4, typeId2:  3 }, // Poison/Flying
  { id:  42, name: 'Golbat', typeId:  4, typeId2:  3 }, // Poison/Flying
  { id:  43, name: 'Oddish', typeId: 12, typeId2:  4 }, // Grass/Poison
  { id:  44, name: 'Gloom', typeId: 12, typeId2:  4 }, // Grass/Poison
  { id:  45, name: 'Vileplume', typeId: 12, typeId2:  4 }, // Grass/Poison
  { id:  46, name: 'Paras', typeId:  7, typeId2: 12 }, // Bug/Grass
  { id:  47, name: 'Parasect', typeId:  7, typeId2: 12 }, // Bug/Grass
  { id:  48, name: 'Venonat', typeId:  7, typeId2:  4 }, // Bug/Poison
  { id:  49, name: 'Venomoth', typeId:  7, typeId2:  4 }, // Bug/Poison
  { id:  50, name: 'Diglett', typeId:  5, typeId2:  0 }, // Ground
  { id:  51, name: 'Dugtrio', typeId:  5, typeId2:  0 }, // Ground
  { id:  52, name: 'Meowth', typeId:  1, typeId2:  0 }, // Normal
  { id:  53, name: 'Persian', typeId:  1, typeId2:  0 }, // Normal
  { id:  54, name: 'Psyduck', typeId: 11, typeId2:  0 }, // Water
  { id:  55, name: 'Golduck', typeId: 11, typeId2:  0 }, // Water
  { id:  56, name: 'Mankey', typeId:  2, typeId2:  0 }, // Fighting
  { id:  57, name: 'Primeape', typeId:  2, typeId2:  0 }, // Fighting
  { id:  58, name: 'Growlithe', typeId: 10, typeId2:  0 }, // Fire
  { id:  59, name: 'Arcanine', typeId: 10, typeId2:  0 }, // Fire
  { id:  60, name: 'Poliwag', typeId: 11, typeId2:  0 }, // Water
  { id:  61, name: 'Poliwhirl', typeId: 11, typeId2:  0 }, // Water
  { id:  62, name: 'Poliwrath', typeId: 11, typeId2:  2 }, // Water/Fighting
  { id:  63, name: 'Abra', typeId: 14, typeId2:  0 }, // Psychic
  { id:  64, name: 'Kadabra', typeId: 14, typeId2:  0 }, // Psychic
  { id:  65, name: 'Alakazam', typeId: 14, typeId2:  0 }, // Psychic
  { id:  66, name: 'Machop', typeId:  2, typeId2:  0 }, // Fighting
  { id:  67, name: 'Machoke', typeId:  2, typeId2:  0 }, // Fighting
  { id:  68, name: 'Machamp', typeId:  2, typeId2:  0 }, // Fighting
  { id:  69, name: 'Bellsprout', typeId: 12, typeId2:  4 }, // Grass/Poison
  { id:  70, name: 'Weepinbell', typeId: 12, typeId2:  4 }, // Grass/Poison
  { id:  71, name: 'Victreebel', typeId: 12, typeId2:  4 }, // Grass/Poison
  { id:  72, name: 'Tentacool', typeId: 11, typeId2:  4 }, // Water/Poison
  { id:  73, name: 'Tentacruel', typeId: 11, typeId2:  4 }, // Water/Poison
  { id:  74, name: 'Geodude', typeId:  6, typeId2:  5 }, // Rock/Ground
  { id:  75, name: 'Graveler', typeId:  6, typeId2:  5 }, // Rock/Ground
  { id:  76, name: 'Golem', typeId:  6, typeId2:  5 }, // Rock/Ground
  { id:  77, name: 'Ponyta', typeId: 10, typeId2:  0 }, // Fire
  { id:  78, name: 'Rapidash', typeId: 10, typeId2:  0 }, // Fire
  { id:  79, name: 'Slowpoke', typeId: 11, typeId2: 14 }, // Water/Psychic
  { id:  80, name: 'Slowbro', typeId: 11, typeId2: 14 }, // Water/Psychic
  { id:  81, name: 'Magnemite', typeId: 13, typeId2:  9 }, // Electric/Steel
  { id:  82, name: 'Magneton', typeId: 13, typeId2:  9 }, // Electric/Steel
  { id:  83, name: 'Farfetchd', typeId:  1, typeId2:  3 }, // Normal/Flying
  { id:  84, name: 'Doduo', typeId:  1, typeId2:  3 }, // Normal/Flying
  { id:  85, name: 'Dodrio', typeId:  1, typeId2:  3 }, // Normal/Flying
  { id:  86, name: 'Seel', typeId: 11, typeId2:  0 }, // Water
  { id:  87, name: 'Dewgong', typeId: 11, typeId2: 15 }, // Water/Ice
  { id:  88, name: 'Grimer', typeId:  4, typeId2:  0 }, // Poison
  { id:  89, name: 'Muk', typeId:  4, typeId2:  0 }, // Poison
  { id:  90, name: 'Shellder', typeId: 11, typeId2:  0 }, // Water
  { id:  91, name: 'Cloyster', typeId: 11, typeId2: 15 }, // Water/Ice
  { id:  92, name: 'Gastly', typeId:  8, typeId2:  4 }, // Ghost/Poison
  { id:  93, name: 'Haunter', typeId:  8, typeId2:  4 }, // Ghost/Poison
  { id:  94, name: 'Gengar', typeId:  8, typeId2:  4 }, // Ghost/Poison
  { id:  95, name: 'Onix', typeId:  6, typeId2:  5 }, // Rock/Ground
  { id:  96, name: 'Drowzee', typeId: 14, typeId2:  0 }, // Psychic
  { id:  97, name: 'Hypno', typeId: 14, typeId2:  0 }, // Psychic
  { id:  98, name: 'Krabby', typeId: 11, typeId2:  0 }, // Water
  { id:  99, name: 'Kingler', typeId: 11, typeId2:  0 }, // Water
  { id: 100, name: 'Voltorb', typeId: 13, typeId2:  0 }, // Electric
  { id: 101, name: 'Electrode', typeId: 13, typeId2:  0 }, // Electric
  { id: 102, name: 'Exeggcute', typeId: 12, typeId2: 14 }, // Grass/Psychic
  { id: 103, name: 'Exeggutor', typeId: 12, typeId2: 14 }, // Grass/Psychic
  { id: 104, name: 'Cubone', typeId:  5, typeId2:  0 }, // Ground
  { id: 105, name: 'Marowak', typeId:  5, typeId2:  0 }, // Ground
  { id: 106, name: 'Hitmonlee', typeId:  2, typeId2:  0 }, // Fighting
  { id: 107, name: 'Hitmonchan', typeId:  2, typeId2:  0 }, // Fighting
  { id: 108, name: 'Lickitung', typeId:  1, typeId2:  0 }, // Normal
  { id: 109, name: 'Koffing', typeId:  4, typeId2:  0 }, // Poison
  { id: 110, name: 'Weezing', typeId:  4, typeId2:  0 }, // Poison
  { id: 111, name: 'Rhyhorn', typeId:  5, typeId2:  6 }, // Ground/Rock
  { id: 112, name: 'Rhydon', typeId:  5, typeId2:  6 }, // Ground/Rock
  { id: 113, name: 'Chansey', typeId:  1, typeId2:  0 }, // Normal
  { id: 114, name: 'Tangela', typeId: 12, typeId2:  0 }, // Grass
  { id: 115, name: 'Kangaskhan', typeId:  1, typeId2:  0 }, // Normal
  { id: 116, name: 'Horsea', typeId: 11, typeId2:  0 }, // Water
  { id: 117, name: 'Seadra', typeId: 11, typeId2:  0 }, // Water
  { id: 118, name: 'Goldeen', typeId: 11, typeId2:  0 }, // Water
  { id: 119, name: 'Seaking', typeId: 11, typeId2:  0 }, // Water
  { id: 120, name: 'Staryu', typeId: 11, typeId2:  0 }, // Water
  { id: 121, name: 'Starmie', typeId: 11, typeId2: 14 }, // Water/Psychic
  { id: 122, name: 'Mr. Mime', typeId: 14, typeId2:  0 }, // Psychic
  { id: 123, name: 'Scyther', typeId:  7, typeId2:  3 }, // Bug/Flying
  { id: 124, name: 'Jynx', typeId: 15, typeId2: 14 }, // Ice/Psychic
  { id: 125, name: 'Electabuzz', typeId: 13, typeId2:  0 }, // Electric
  { id: 126, name: 'Magmar', typeId: 10, typeId2:  0 }, // Fire
  { id: 127, name: 'Pinsir', typeId:  7, typeId2:  0 }, // Bug
  { id: 128, name: 'Tauros', typeId:  1, typeId2:  0 }, // Normal
  { id: 129, name: 'Magikarp', typeId: 11, typeId2:  0 }, // Water
  { id: 130, name: 'Gyarados', typeId: 11, typeId2:  3 }, // Water/Flying
  { id: 131, name: 'Lapras', typeId: 11, typeId2: 15 }, // Water/Ice
  { id: 132, name: 'Ditto', typeId:  1, typeId2:  0 }, // Normal
  { id: 133, name: 'Eevee', typeId:  1, typeId2:  0 }, // Normal
  { id: 134, name: 'Vaporeon', typeId: 11, typeId2:  0 }, // Water
  { id: 135, name: 'Jolteon', typeId: 13, typeId2:  0 }, // Electric
  { id: 136, name: 'Flareon', typeId: 10, typeId2:  0 }, // Fire
  { id: 137, name: 'Porygon', typeId:  1, typeId2:  0 }, // Normal
  { id: 138, name: 'Omanyte', typeId:  6, typeId2: 11 }, // Rock/Water
  { id: 139, name: 'Omastar', typeId:  6, typeId2: 11 }, // Rock/Water
  { id: 140, name: 'Kabuto', typeId:  6, typeId2: 11 }, // Rock/Water
  { id: 141, name: 'Kabutops', typeId:  6, typeId2: 11 }, // Rock/Water
  { id: 142, name: 'Aerodactyl', typeId:  6, typeId2:  3 }, // Rock/Flying
  { id: 143, name: 'Snorlax', typeId:  1, typeId2:  0 }, // Normal
  { id: 144, name: 'Articuno', typeId: 15, typeId2:  3 }, // Ice/Flying
  { id: 145, name: 'Zapdos', typeId: 13, typeId2:  3 }, // Electric/Flying
  { id: 146, name: 'Moltres', typeId: 10, typeId2:  3 }, // Fire/Flying
  { id: 147, name: 'Dratini', typeId: 16, typeId2:  0 }, // Dragon
  { id: 148, name: 'Dragonair', typeId: 16, typeId2:  0 }, // Dragon
  { id: 149, name: 'Dragonite', typeId: 16, typeId2:  3 }, // Dragon/Flying
  { id: 150, name: 'Mewtwo', typeId: 14, typeId2:  0 }, // Psychic
  { id: 151, name: 'Mew', typeId: 14, typeId2:  0 }, // Psychic
]

/**
 * Get the Pokedex based on current mode
 * Dev mode: First 20 Pokemon
 * Normal mode: All 151 Pokemon
 * @returns {Array} Pokemon array
 */
export function getPokedex() {
  if (isDevMode()) {
    return POKEDEX_FULL.slice(0, DEV_MODE_LIMIT)
  }
  return POKEDEX_FULL
}

// Legacy export for backwards compatibility
// NOTE: Prefer getPokedex() for dynamic mode support
export const POKEDEX = POKEDEX_FULL

/**
 * Get a random Pokemon from the Pokedex (respects dev mode)
 * @returns {Object} Pokemon data
 */
export function getRandomPokemon() {
  const pokedex = getPokedex()
  const idx = Math.floor(Math.random() * pokedex.length)
  return pokedex[idx]
}

/**
 * Get Pokemon by ID (always searches full list)
 * @param {number} id - Pokemon ID
 * @returns {Object|null} Pokemon data or null if not found
 */
export function getPokemonById(id) {
  return POKEDEX_FULL.find(p => p.id === id) || null
}
