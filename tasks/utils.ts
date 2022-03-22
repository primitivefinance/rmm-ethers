export function parseEvent(receipt: any, name: string) {
  const events = receipt?.events
  let args: any[] = []
  events.forEach(event => {
    if (event.event) {
      if ((event.event as string).toLowerCase() === name.toLowerCase()) args = event.args
    }
  })
  return args
}
