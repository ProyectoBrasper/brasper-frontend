/**
 * Up to two uppercase initials for an avatar: "Carla Mendoza Rojas" → "CM",
 * "Agroindustrias Pampa Dorada S.A.C." → "AP".
 */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => /^\p{L}/u.test(word))
    .slice(0, 2)
    .map((word) => word[0].toLocaleUpperCase('es-PE'))
    .join('');
}
