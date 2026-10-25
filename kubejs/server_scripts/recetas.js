// ===== Recetas custom - Gonx Zero =====
// Requiere el mod Gonx Zero (gonxzero) y el mod de vehiculos (vehicle).

ServerEvents.recipes(event => {
  // Combustible: bloque de polvora + cubeta de lava + bloque de polvora = cubeta de Fuelium.
  // replaceIngredient evita que la receta devuelva una cubeta vacia extra
  // (si no, cada combustible "crearia" una cubeta de la nada).
  event.shaped('vehicle:fuelium_bucket', ['GLG'], {
    G: 'gonxzero:bloque_polvora',
    L: 'minecraft:lava_bucket'
  }).replaceIngredient('minecraft:lava_bucket', 'minecraft:air').id('gonxzero:fuelium_desde_lava')

  // El Fuelium original del mod de vehiculos no carga en este port; se quita para que no aparezca roto.
  event.remove({ id: 'vehicle:fuelium_mixing' })

  // El helicoptero compacto crashea al interactuar: sin receta.
  event.remove({ output: 'vehicle:compact_helicopter' })
})
