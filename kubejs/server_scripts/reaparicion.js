// ===== Reaparicion estilo "recarga" - Gonx Zero (v5) =====
// Sin template literals: el motor Rhino de KubeJS falla con algunos.
const RESPAWN_SECONDS = 20    // segundos de cuenta regresiva
const RESPAWN_HEIGHT = 30     // bloques arriba del lugar de muerte
const SLOW_FALL_SECONDS = 15  // segundos de caida lenta
const RESPAWN_DEBUG = true    // ponlo en false cuando ya funcione

const pendingRespawns = {}

function rspDebug(srv, msg) {
  console.info('[Reaparicion] ' + msg)
  if (RESPAWN_DEBUG) srv.tell(Text.gray('[DEBUG] ' + msg))
}

function rspCmd(srv, command) {
  srv.runCommandSilent(command)
}

function rspIsOnline(srv, pName) {
  return srv.getPlayerList().getPlayerByName(pName) != null
}

function rspTp(srv, pName, x, y, z, yaw, pitch) {
  rspCmd(srv, 'execute in minecraft:overworld run tp ' + pName + ' ' + x + ' ' + y + ' ' + z + ' ' + yaw + ' ' + pitch)
}

// 1) Al morir: guardar posicion, mirada y modo (solo supervivencia/aventura)
EntityEvents.death('minecraft:player', event => {
  let srv = event.server
  let deadPlayer = event.entity
  try {
    if (deadPlayer.isCreative() || deadPlayer.isSpectator()) return
    let data = {
      x: deadPlayer.x,
      y: Math.max(deadPlayer.y, -60),
      z: deadPlayer.z,
      yaw: deadPlayer.yaw,
      pitch: deadPlayer.pitch,
      mode: deadPlayer.gameMode.gameModeForPlayer.getName()
    }
    pendingRespawns[deadPlayer.username] = data
    rspDebug(srv, 'Muerte guardada: ' + Math.floor(data.x) + ' ' + Math.floor(data.y) + ' ' + Math.floor(data.z) +
      ' mirada ' + data.yaw + '/' + data.pitch + ' modo ' + data.mode)
  } catch (e) {
    rspDebug(srv, 'ERROR al morir: ' + e)
  }
})

// Reaparicion final: en el aire, con caida lenta y la misma mirada
function rspFinish(srv, pName) {
  let info = pendingRespawns[pName]
  try {
    if (!info) return
    delete pendingRespawns[pName]
    if (!rspIsOnline(srv, pName)) return
    rspTp(srv, pName, info.x, info.y + RESPAWN_HEIGHT, info.z, info.yaw, info.pitch)
    rspCmd(srv, 'gamemode ' + info.mode + ' ' + pName)
    rspCmd(srv, 'effect give ' + pName + ' minecraft:slow_falling ' + SLOW_FALL_SECONDS + ' 0 true')
    rspCmd(srv, 'title ' + pName + ' clear')
    rspDebug(srv, 'Reaparicion final hecha')
  } catch (e) {
    rspDebug(srv, 'ERROR al reaparecer: ' + e)
  }
}

// Un segundo de la cuenta regresiva
function rspTick(srv, pName, delayTicks, secondsLeft) {
  srv.scheduleInTicks(delayTicks, () => {
    try {
      if (!pendingRespawns[pName] || !rspIsOnline(srv, pName)) return
      rspCmd(srv, 'title ' + pName + ' subtitle {"text":"' + secondsLeft + '","color":"white","bold":true}')
      rspCmd(srv, 'title ' + pName + ' title {"text":"REAPARECIENDO","color":"red","bold":true}')
      rspCmd(srv, 'execute as ' + pName + ' at @s run playsound minecraft:block.note_block.hat master @s ~ ~ ~ 1 1')
    } catch (e) {
      rspDebug(srv, 'ERROR en cuenta regresiva: ' + e)
    }
  })
}

// 2) Al reaparecer: espectador en el lugar de muerte + cuenta regresiva
PlayerEvents.respawned(event => {
  let srv = event.server
  let pName = event.player.username
  let info = pendingRespawns[pName]
  try {
    rspDebug(srv, 'Reaparecio ' + pName + ', pendiente: ' + (info ? 'si' : 'no'))
    if (!info) return
    rspCmd(srv, 'gamemode spectator ' + pName)
    rspTp(srv, pName, info.x, info.y + 1, info.z, info.yaw, info.pitch)
    rspCmd(srv, 'title ' + pName + ' times 0 30 5')
    for (let s = 0; s < RESPAWN_SECONDS; s++) {
      rspTick(srv, pName, s * 20 + 1, RESPAWN_SECONDS - s)
    }
    srv.scheduleInTicks(RESPAWN_SECONDS * 20 + 1, () => rspFinish(srv, pName))
    rspDebug(srv, 'Cuenta regresiva programada')
  } catch (e) {
    rspDebug(srv, 'ERROR al iniciar reaparicion: ' + e)
  }
})

// 3) Si se desconecto durante la cuenta, reaparece al volver a entrar
PlayerEvents.loggedIn(event => {
  let srv = event.server
  let pName = event.player.username
  if (pendingRespawns[pName]) {
    srv.scheduleInTicks(20, () => rspFinish(srv, pName))
  }
})