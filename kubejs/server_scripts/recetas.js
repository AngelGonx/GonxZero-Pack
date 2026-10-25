// ===== Recetas custom - Gonx Zero =====
// Requiere el mod Gonx Zero (gonxzero) y el mod de vehiculos (vehicle).

ServerEvents.recipes(event => {
  // Combustible: bloque de polvora + cubeta de lava + bloque de polvora = cubeta de Fuelium.
  // Nota: como en vanilla, al craftear se devuelve la cubeta vacia de la lava.
  event.shaped('vehicle:fuelium_bucket', ['GLG'], {
    G: 'gonxzero:bloque_polvora',
    L: 'minecraft:lava_bucket'
  }).id('gonxzero:fuelium_desde_lava')
})
