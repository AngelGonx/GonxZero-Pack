// ===== Paracaidas visual - Gonx Zero (v2) =====
// Aparece cuando el jugador tiene Caida Lenta y esta en el aire.
// Lona rectangular curva (3 paneles) + 4 cuerdas desde los hombros.
// Sigue al jugador cada tick y gira con su mirada.

// --- Ajustes ---
const PARA_CHECK_TICKS = 4                       // cada cuantos ticks se revisa el efecto
const PARA_CANOPY_BLOCK = 'minecraft:white_wool' // lona
const PARA_SIDE_BLOCK = 'minecraft:white_wool'   // paneles laterales (puedes usar otro color)
const PARA_ROPE_BLOCK = 'minecraft:light_gray_concrete' // cuerdas
const PARA_HEIGHT = 3.6        // altura del panel central sobre los pies
const PARA_CENTER_WIDTH = 2.0  // ancho del panel central (de lado a lado)
const PARA_SIDE_WIDTH = 1.5    // ancho de cada panel lateral
const PARA_DEPTH = 1.8         // profundidad (de adelante hacia atras)
const PARA_THICKNESS = 0.12    // grosor de la lona
const PARA_SIDE_ANGLE = 35     // grados que bajan los paneles laterales (curva)
const PARA_ROPE_WIDTH = 0.035  // grosor de las cuerdas
const PARA_SHOULDER_X = 0.32   // separacion de los hombros
const PARA_SHOULDER_Y = 1.25   // altura de los hombros (mas bajo = salen mas abajo)
const PARA_DEBUG = true        // ponlo en false cuando ya funcione

const parachuteActive = {}

function paraDebug(srv, msg) {
  console.info('[Paracaidas] ' + msg)
  if (PARA_DEBUG) srv.tell(Text.gray('[DEBUG] ' + msg))
}

function paraTag(pName) {
  return 'gonx_para_' + pName
}

function paraF(n) {
  return Number(n).toFixed(4) + 'f'
}

// Cuaternion de rotacion alrededor de un eje (normalizado) con angulo en radianes
function paraQuat(ax, ay, az, angle) {
  let s = Math.sin(angle / 2)
  return [ax * s, ay * s, az * s, Math.cos(angle / 2)]
}

// Cuaternion que gira el eje Y (0,1,0) hacia el vector (vx,vy,vz)
function paraQuatFromY(vx, vy, vz) {
  let len = Math.sqrt(vx * vx + vy * vy + vz * vz)
  let nx = vx / len
  let ny = vy / len
  let nz = vz / len
  // eje = Y x v = (nz, 0, -nx)
  let axLen = Math.sqrt(nz * nz + nx * nx)
  if (axLen < 0.00001) return [0, 0, 0, 1]
  let angle = Math.acos(Math.max(-1, Math.min(1, ny)))
  return paraQuat(nz / axLen, 0, -nx / axLen, angle)
}

// Construye la lista de piezas del paracaidas
function paraPieces() {
  let pieces = []
  let rad = PARA_SIDE_ANGLE * Math.PI / 180
  let halfC = PARA_CENTER_WIDTH / 2
  let halfD = PARA_DEPTH / 2
  let sideDx = PARA_SIDE_WIDTH * Math.cos(rad)
  let sideDy = PARA_SIDE_WIDTH * Math.sin(rad)

  // Panel central (plano)
  pieces.push({
    block: PARA_CANOPY_BLOCK,
    t: [-halfC, PARA_HEIGHT, -halfD],
    r: [0, 0, 0, 1],
    s: [PARA_CENTER_WIDTH, PARA_THICKNESS, PARA_DEPTH]
  })
  // Panel derecho: empieza en el borde del central y baja hacia afuera
  pieces.push({
    block: PARA_SIDE_BLOCK,
    t: [halfC, PARA_HEIGHT, -halfD],
    r: paraQuat(0, 0, 1, -rad),
    s: [PARA_SIDE_WIDTH, PARA_THICKNESS, PARA_DEPTH]
  })
  // Panel izquierdo: empieza abajo afuera y sube hasta el borde del central
  pieces.push({
    block: PARA_SIDE_BLOCK,
    t: [-halfC - sideDx, PARA_HEIGHT - sideDy, -halfD],
    r: paraQuat(0, 0, 1, rad),
    s: [PARA_SIDE_WIDTH, PARA_THICKNESS, PARA_DEPTH]
  })

  // Cuerdas: de cada hombro a las 2 esquinas exteriores de su lado
  let cornerY = PARA_HEIGHT - sideDy
  let cornerX = halfC + sideDx
  let ropes = [
    [PARA_SHOULDER_X, cornerX, -halfD],
    [PARA_SHOULDER_X, cornerX, halfD],
    [-PARA_SHOULDER_X, -cornerX, -halfD],
    [-PARA_SHOULDER_X, -cornerX, halfD]
  ]
  for (let i = 0; i < ropes.length; i++) {
    let sx = ropes[i][0]
    let ex = ropes[i][1]
    let ez = ropes[i][2]
    let vx = ex - sx
    let vy = cornerY - PARA_SHOULDER_Y
    let vz = ez
    let len = Math.sqrt(vx * vx + vy * vy + vz * vz)
    pieces.push({
      block: PARA_ROPE_BLOCK,
      t: [sx - PARA_ROPE_WIDTH / 2, PARA_SHOULDER_Y, -PARA_ROPE_WIDTH / 2],
      r: paraQuatFromY(vx, vy, vz),
      s: [PARA_ROPE_WIDTH, len, PARA_ROPE_WIDTH]
    })
  }
  return pieces
}

function paraNbt(pName, piece) {
  return '{Tags:["gonx_para","' + paraTag(pName) + '"],' +
    'teleport_duration:2,' +
    'block_state:{Name:"' + piece.block + '"},' +
    'transformation:{' +
    'left_rotation:[' + paraF(piece.r[0]) + ',' + paraF(piece.r[1]) + ',' + paraF(piece.r[2]) + ',' + paraF(piece.r[3]) + '],' +
    'right_rotation:[0f,0f,0f,1f],' +
    'translation:[' + paraF(piece.t[0]) + ',' + paraF(piece.t[1]) + ',' + paraF(piece.t[2]) + '],' +
    'scale:[' + paraF(piece.s[0]) + ',' + paraF(piece.s[1]) + ',' + paraF(piece.s[2]) + ']}}'
}

function paraSpawn(srv, pName) {
  let pieces = paraPieces()
  for (let i = 0; i < pieces.length; i++) {
    srv.runCommandSilent('execute as ' + pName + ' at @s rotated ~ 0 run summon minecraft:block_display ~ ~ ~ ' + paraNbt(pName, pieces[i]))
  }
  parachuteActive[pName] = true
  paraDebug(srv, 'Paracaidas abierto: ' + pName)
}

function paraFollow(srv, pName) {
  srv.runCommandSilent('execute as ' + pName + ' at @s run tp @e[type=minecraft:block_display,tag=' + paraTag(pName) + '] ~ ~ ~ ~ 0')
}

function paraRemove(srv, pName) {
  srv.runCommandSilent('kill @e[type=minecraft:block_display,tag=' + paraTag(pName) + ']')
  if (parachuteActive[pName]) paraDebug(srv, 'Paracaidas cerrado: ' + pName)
  delete parachuteActive[pName]
}

// Cada tick: seguir al jugador. Cada PARA_CHECK_TICKS: revisar si abrir/cerrar.
PlayerEvents.tick(event => {
  let paraPlayer = event.player
  let srv = event.server
  let pName = paraPlayer.username
  try {
    if (parachuteActive[pName]) paraFollow(srv, pName)
    if (paraPlayer.tickCount % PARA_CHECK_TICKS != 0) return

    let falling = paraPlayer.potionEffects.isActive('minecraft:slow_falling') &&
      !paraPlayer.onGround() &&
      !paraPlayer.isSpectator()

    if (falling && !parachuteActive[pName]) {
      paraSpawn(srv, pName)
    } else if (!falling && parachuteActive[pName]) {
      paraRemove(srv, pName)
    }
  } catch (e) {
    paraDebug(srv, 'ERROR: ' + e)
  }
})

// Limpieza al morir o desconectarse
EntityEvents.death('minecraft:player', event => {
  paraRemove(event.server, event.entity.username)
})

PlayerEvents.loggedOut(event => {
  paraRemove(event.server, event.player.username)
})

// Al iniciar el server, borrar paracaidas que hayan quedado sueltos
ServerEvents.loaded(event => {
  event.server.runCommandSilent('kill @e[type=minecraft:block_display,tag=gonx_para]')
})