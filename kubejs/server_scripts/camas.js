// ===== Camas malditas - Gonx Zero =====
// Si un jugador (supervivencia/aventura) intenta usar una cama:
// - No duerme ni guarda punto de reaparicion.
// - La cama se rompe sin soltar nada.
// - Aparecen VEX_COUNT vex que viven VEX_LIFE_SECONDS segundos.
// En creativo se puede usar normal (para los admins).
const VEX_COUNT = 5
const VEX_LIFE_SECONDS = 60

const BED_DEBUG = false  // ponlo en true para ver mensajes de prueba

BlockEvents.rightClicked(event => {
  let bedBlock = event.block
  let bedPlayer = event.player
  if (BED_DEBUG) {
    bedPlayer.tell(Text.gray('[DEBUG camas] clic en ' + bedBlock.id + ' | es cama: ' + bedBlock.hasTag('minecraft:beds') +
      ' | creativo: ' + bedPlayer.isCreative() + ' | mano: ' + event.hand))
  }
  if (!bedBlock.hasTag('minecraft:beds')) return
  if (bedPlayer.isCreative() || bedPlayer.isSpectator()) return

  let srv = event.server
  let bx = bedBlock.x
  let by = bedBlock.y
  let bz = bedBlock.z
  let pos = bx + ' ' + by + ' ' + bz
  let center = (bx + 0.5) + ' ' + (by + 0.6) + ' ' + (bz + 0.5)

  // Romper la cama. La otra mitad se rompe sola y vanilla la suelta como item,
  // asi que se borra cualquier cama soltada alrededor.
  srv.runCommandSilent('setblock ' + pos + ' minecraft:air')
  let bedLevel = event.level
  let nearby = bedLevel.getEntitiesWithin(AABB.of(bx - 2, by - 1, bz - 2, bx + 3, by + 2, bz + 3))
  nearby.forEach(ent => {
    if (ent.type == 'minecraft:item' && ent.item.hasTag('minecraft:beds')) ent.discard()
  })

  // Efectos
  srv.runCommandSilent('particle minecraft:large_smoke ' + center + ' 0.6 0.4 0.6 0.02 40 force')
  srv.runCommandSilent('particle minecraft:soul ' + center + ' 0.6 0.4 0.6 0.02 15 force')
  srv.runCommandSilent('playsound minecraft:entity.evoker.prepare_summon hostile @a ' + center + ' 1.5 0.8')
  srv.runCommandSilent('playsound minecraft:entity.vex.charge hostile @a ' + center + ' 1.5 0.6')

  // Invocar los vex alrededor de la cama
  let lifeTicks = VEX_LIFE_SECONDS * 20
  for (let i = 0; i < VEX_COUNT; i++) {
    let angle = (Math.PI * 2 * i) / VEX_COUNT
    let vx = bx + 0.5 + Math.cos(angle) * 1.5
    let vz = bz + 0.5 + Math.sin(angle) * 1.5
    srv.runCommandSilent('summon minecraft:vex ' + vx + ' ' + (by + 1.5) + ' ' + vz + ' {LifeTicks:' + lifeTicks + '}')
  }

  bedPlayer.tell(Text.darkRed('La cama estaba maldita... no hay descanso en esta ciudad.'))

  // IMPORTANTE: en KubeJS, cancel() termina el script en este punto,
  // por eso va al final (si va antes, lo de arriba nunca se ejecuta).
  event.cancel()
})
