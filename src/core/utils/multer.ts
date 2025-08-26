import multer from 'multer'
import fs from 'fs'
import path from 'path'

const uploadFilePath = path.resolve(__dirname, '../../..', 'public/uploads');

const dir = uploadFilePath

console.log(uploadFilePath)

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // recursively create multiple directories
    fs.mkdir(dir, { recursive: true }, err => {
      if (err) {
        throw err
      }

      cb(null, uploadFilePath)

      console.log('Directory is created.')
    })
  },
  filename: function (req, file, cb) {
    console.log(file)
    cb(null, `${new Date().getTime().toString()}-${file.fieldname}${path.extname(file.originalname)}`);
  }
})

const upload = multer({
  storage: storage, limits: {
    fileSize: 10000000
  }
})

export { upload }
