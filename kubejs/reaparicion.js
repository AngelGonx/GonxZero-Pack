// ===== Reaparición estilo "recarga" — Gonx Zero =====
const RESPAWN_SECONDS = 10    // segundos de cuenta regresiva
const RESPAWN_HEIGHT = 30     // bloques arriba del lugar de muerte
const SLOW_FALL_SECONDS = 15  // segundos de caída lenta

// Jugadores esperando reaparecer: nombre -> { x, y, z, mode }
const pendingRespawns = {}

// 1) Al morir: guardar posición y modo (solo supervivencia/aventura)
EntityEvents.death('minecraft:player', event => {
  const player = event.entity
  if (player.isCreative() || player.isSpectator()) return

  pendingRespawns[player.username] = {
    x: player.x,
    y: Math.max(player.y, -60), // por si muere en el vacío
    z: player.z,
    mode: player.gameMode.getGameModeForPlayer().getName()
  }
})

// Reaparición final: en el aire, con caída lenta
function finishRespawn(server, name) {
  const info = pendingRespawns[name]
  if (!info) return
  delete pendingRespawns[name]
  if (!server.getPlayer(name)) return

  server.runCommandSilent(`execute in minecraft:overworld run tp ${name} ${info.x} ${info.y + RESPAWN_HEIGHT} ${info.z}`)
  server.runCommandSilent(`gamemode ${info.mode} ${name}`)
  server.runCommandSilent(`effect give ${name} minecraft:slow_falling ${SLOW_FALL_SECONDS} 0 true`)
  server.runCommandSilent(`title ${name} clear`)
}

// 2) Al reaparecer: espectador en el lugar de muerte + cuenta regresiva
PlayerEvents.respawned(event => {
  const player = event.player
  const server = event.server
  const name = player.username
  const info = pendingRespawns[name]
  if (!info) return

  server.runCommandSilent(`gamemode spectator ${name}`)
  server.runCommandSilent(`execute in minecraft:overworld run tp ${name} ${info.x} ${info.y + 1} ${info.z}`)
  server.runCommandSilent(`title ${name} times 0 30 5`)

  for (let i = 0; i < RESPAWN_SECONDS; i++) {
    const secondsLeft = RESPAWN_SECONDS - i
    server.scheduleInTicks(i * 20 + 1, () => {
      if (!server.getPlayer(name) || !pendingRespawns[name]) return
      server.runCommandSilent(`title ${name} subtitle {"text":"${secondsLeft}","color":"white","bold":true}`)
      server.runCommandSilent(`title ${name} title {"text":"REAPARECIENDO","color":"red","bold":true}`)
      server.runCommandSilent(`execute as ${name} at @s run playsound minecraft:block.note_block.hat master @s ~ ~ ~ 1 1`)
    })
  }

  server.scheduleInTicks(RESPAWN_SECONDS * 20 + 1, () => finishRespawn(server, name))
})

// 3) Si se desconectó durante la cuenta, reaparece al volver a entrar
PlayerEvents.loggedIn(event => {
  const name = event.player.username
  if (pendingRespawns[name]) {
    event.server.scheduleInTicks(20, () => finishRespawn(event.server, name))
  }
})