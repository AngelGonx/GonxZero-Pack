// ☠ Muerte: mensaje en rojo para todos + sonido de "cañón"
EntityEvents.death('minecraft:player', event => {
  const player = event.entity
  const server = event.server
  const deathMsg = player.combatTracker.getDeathMessage()

  server.tell(Text.red('☠ ').append(Text.of(deathMsg).red()))
  server.runCommandSilent('execute as @a at @s run playsound minecraft:entity.generic.explode master @s ~ ~ ~ 1 0.5')
})

// ✦ Tótem: aviso en dorado para todos
NativeEvents.onEvent('net.neoforged.neoforge.event.entity.living.LivingUseTotemEvent', event => {
  const entity = event.getEntity()
  if (!entity.isPlayer()) return
  entity.server.tell(Text.gold(`✦ ${entity.username} usó un tótem de la inmortalidad`))
})