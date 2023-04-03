export const findPlayer = () => {
  const objects = []
  const payload_id = "payload" + String(Math.trunc(performance.now()))
  globalThis.webpackJsonp.push([
    payload_id,
    {
      [payload_id]: function (_e, _t, require) {
        for (const module of Object.values(require.c)) {
          for (const object of Object.values(module?.exports ?? {})) {
            objects.push(object)
          }
        }
      },
    },
    [[payload_id]],
  ])

  for (const obj of objects) {
    if (typeof obj.whoAmI === "function" && obj.whoAmI() === "Player") {
      return obj
    }
  }
}

console.log(findPlayer())
