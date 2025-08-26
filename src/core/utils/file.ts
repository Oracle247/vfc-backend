import { NODE_ENV, PORT } from "../../config"

const getFileLink = (req: any,) => {
  console.log(NODE_ENV)
  if (NODE_ENV == "development") {
    return `${req.protocol}://${req.hostname}:${PORT}/uploads/${(req.file.filename)}`
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  return `${"https" ?? req.protocol}://${req.hostname}/uploads/${(req.file.filename)}`
}

export { getFileLink }
